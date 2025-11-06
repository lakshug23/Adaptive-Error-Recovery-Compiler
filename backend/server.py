#!/usr/bin/env python3
"""
Simple real backend using clang for diagnostics and minimal-fix heuristics.
Endpoints:
- POST /compile { code }
- POST /fix { code }

This server runs clang with resource limits and returns JSON diagnostics.
"""
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import subprocess
import tempfile
import json
import os
import shutil
import sys
import time
import resource
from typing import List, Dict, Any

app = FastAPI()

class CodePayload(BaseModel):
    code: str

# Helper to set resource limits for child process
def _limit_resources():
    try:
        # 2 seconds CPU time
        resource.setrlimit(resource.RLIMIT_CPU, (2, 2))
    except Exception:
        # not all platforms support setting RLIMIT_CPU from Python or the OS may restrict it
        pass
    try:
        # 200 MB address space (may not be supported on macOS)
        if hasattr(resource, 'RLIMIT_AS'):
            resource.setrlimit(resource.RLIMIT_AS, (200 * 1024 * 1024, 200 * 1024 * 1024))
    except Exception:
        # ignore failures to set address-space limits (platform dependent)
        pass

# Try to run clang/clang++ for diagnostics
def run_clang_diagnostics(source_path: str) -> Dict[str, Any]:
    clang = shutil.which('clang') or shutil.which('clang-14') or shutil.which('clang-13')
    if not clang:
        raise FileNotFoundError('clang not found on PATH')

    # Use JSON diagnostics if supported
    cmd = [clang, '-fsyntax-only', '-fno-color-diagnostics', '-fdiagnostics-format=json', source_path]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False, preexec_fn=_limit_resources, timeout=4)
    except subprocess.TimeoutExpired:
        return {'timeout': True, 'output': ''}

    # clang writes diagnostics to stderr
    text = res.stderr.decode('utf-8', errors='replace')

    try:
        data = json.loads(text)
        return {'diagnostics': data.get('diagnostics', [])}
    except Exception:
        # fallback: try to extract JSON object inside text
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            try:
                obj = json.loads(text[start:end+1])
                return {'diagnostics': obj.get('diagnostics', [])}
            except Exception:
                pass
        # otherwise return raw text for heuristics
        return {'raw': text}

# Map clang diagnostics to our schema
def map_clang_diags(diags: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for d in diags:
        message = d.get('message', '')
        level = d.get('level', 'error')
        loc = d.get('location', {})
        line = loc.get('line') if isinstance(loc, dict) else None
        typ = 'Error' if level == 'error' else 'Warning'
        out.append({'type': typ, 'message': message, 'line': line})
    return out

# Basic heuristic fix generator using clang diagnostics when available
def generate_fixes_from_clang(code: str, diagnostics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    fixes = []
    lines = code.splitlines()

    for d in diagnostics:
        msg = d.get('message', '').lower()
        # missing include for printf (implicit declaration)
        if 'implicit declaration of function' in msg or "printf" in msg and 'undeclared' in msg:
            # suggest adding stdio include if not present
            if not any('#include <stdio.h>' in l for l in lines):
                fixes.append({
                    'description': 'Add #include <stdio.h> at top',
                    'confidence': 0.95,
                    'edit': {'type': 'insert', 'line': 1, 'content': '#include <stdio.h>\n'}
                })
        # missing semicolon
        if 'expected' in msg and (';' in msg or 'semicolon' in msg):
            # try to find the line
            ln = d.get('location', {}).get('line') if isinstance(d.get('location', {}), dict) else None
            if not ln:
                # fallback: find a line with printf not ending in semicolon
                for i,l in enumerate(lines):
                    if 'printf(' in l and not l.strip().endswith(';'):
                        fixes.append({'description': 'Add missing semicolon', 'confidence': 0.9, 'edit': {'type': 'replace', 'line': i+1, 'original': l, 'replacement': l + ';'}})
                        break
            else:
                idx = ln-1
                if 0 <= idx < len(lines):
                    l = lines[idx]
                    if not l.strip().endswith(';'):
                        fixes.append({'description': 'Add missing semicolon', 'confidence': 0.9, 'edit': {'type': 'replace', 'line': ln, 'original': l, 'replacement': l + ';'}})
        # extra semicolons
        if 'extra' in msg or 'semicolon' in msg and 'unexpected' in msg:
            ln = d.get('location', {}).get('line') if isinstance(d.get('location', {}), dict) else None
            if ln:
                idx = ln-1
                if 0 <= idx < len(lines) and ';;' in lines[idx]:
                    orig = lines[idx]
                    repl = orig.replace(';;',';')
                    fixes.append({'description': 'Remove extra semicolon', 'confidence': 0.9, 'edit': {'type': 'replace', 'line': ln, 'original': orig, 'replacement': repl}})
    return fixes

# Fallback heuristics (similar to previous mock)
def generate_fallback_fixes(code: str, errors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # reuse simple heuristics from previous mock implementation
    fixes = []
    lines = code.splitlines()
    # detect printf without stdio
    if any('printf(' in l for l in lines) and not any('#include <stdio.h>' in l for l in lines):
        fixes.append({'description': 'Add #include <stdio.h> at top', 'confidence': 0.9, 'edit': {'type': 'insert', 'line': 1, 'content': '#include <stdio.h>\n'}})
    # missing semicolon
    for i,l in enumerate(lines):
        if 'printf(' in l and not l.strip().endswith(';'):
            fixes.append({'description': 'Add missing semicolon', 'confidence': 0.9, 'edit': {'type': 'replace', 'line': i+1, 'original': l, 'replacement': l + ';'}})
            break
    # extra semicolon
    for i,l in enumerate(lines):
        if ';;' in l:
            fixes.append({'description': 'Remove extra semicolon', 'confidence': 0.9, 'edit': {'type': 'replace', 'line': i+1, 'original': l, 'replacement': l.replace(';;',';')}})
            break
    return fixes

@app.post('/compile')
async def compile_code(payload: CodePayload):
    # write code to temporary file
    with tempfile.TemporaryDirectory() as tmpdir:
        src_path = os.path.join(tmpdir, 'main.c')
        with open(src_path, 'w') as f:
            f.write(payload.code)

        try:
            result = run_clang_diagnostics(src_path)
        except FileNotFoundError:
            # clang not available — fallback to heuristics
            errors = []
            # reuse simple heuristics
            if 'printf(' in payload.code and '#include <stdio.h>' not in payload.code:
                errors.append({'type': 'ReferenceError', 'message': 'printf may be undeclared (missing #include <stdio.h>)'})
            if payload.code.count('{') != payload.code.count('}'):
                errors.append({'type': 'SyntaxError', 'message': 'Unmatched braces'})
            # extra semicolon
            if ';;' in payload.code:
                # find line
                for i,l in enumerate(payload.code.splitlines()):
                    if ';;' in l:
                        errors.append({'type':'SyntaxWarning','message':'Extra semicolon detected','line':i+1})
                        break
            fixes = generate_fallback_fixes(payload.code, errors)
            if errors:
                return {'status':'error','message':'Compilation failed (heuristic)','tokens':[], 'errors': errors, 'fixes': fixes}
            else:
                return {'status':'success','message':'Compilation OK (heuristic)','tokens':[], 'errors':[], 'fixes': []}

        # if clang returned raw text
        if 'raw' in result:
            raw = result['raw']
            # basic parse for known patterns
            errors = []
            if 'implicit declaration of function' in raw or 'undeclared' in raw and 'printf' in raw:
                errors.append({'type':'ReferenceError','message':'printf may be undeclared (missing #include <stdio.h>)'})
            if 'error' in raw or 'warning' in raw:
                # capture lines with 'error' occurrences
                errors.append({'type':'Error','message': raw[:200]})
            fixes = generate_fallback_fixes(payload.code, errors)
            if errors:
                return {'status':'error','message':'Compilation failed','tokens':[], 'errors': errors, 'fixes': fixes}
            else:
                return {'status':'success','message':'Compilation OK','tokens':[], 'errors':[], 'fixes': []}

        diags = result.get('diagnostics', [])
        mapped = map_clang_diags(diags)
        fixes = generate_fixes_from_clang(payload.code, diags)
        if mapped:
            return {'status':'error','message':'Compilation failed','tokens':[], 'errors': mapped, 'fixes': fixes}
        else:
            return {'status':'success','message':'Compilation succeeded','tokens':[], 'errors':[], 'fixes': []}

@app.post('/fix')
async def fix_code(payload: CodePayload):
    # run clang diagnostics and produce fixes
    with tempfile.TemporaryDirectory() as tmpdir:
        src_path = os.path.join(tmpdir, 'main.c')
        with open(src_path, 'w') as f:
            f.write(payload.code)
        try:
            result = run_clang_diagnostics(src_path)
        except FileNotFoundError:
            fixes = generate_fallback_fixes(payload.code, [])
            return {'fixes': fixes}

        if 'raw' in result:
            fixes = generate_fallback_fixes(payload.code, [])
            return {'fixes': fixes}

        diags = result.get('diagnostics', [])
        fixes = generate_fixes_from_clang(payload.code, diags)
        return {'fixes': fixes}

if __name__ == '__main__':
    # Run uvicorn if executed directly
    import uvicorn
    port = int(os.environ.get('BACKEND_PORT', '8000'))
    # When run as a script the package name 'backend' may not be importable;
    # pass the app object directly to uvicorn to avoid ModuleNotFoundError.
    uvicorn.run(app, host='127.0.0.1', port=port, reload=False)
