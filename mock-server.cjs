// Simple mock backend server for POST /compile
// Uses only Node built-in modules so no extra dependencies are required.

const http = require('http');

const PORT = 8000;

function sendJSON(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  // handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.url === '/compile' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const code = payload.code || '';

  // Very small mock logic: simple heuristics to simulate compilation errors
  const errors = [];
  const lines = code.split(/\r?\n/);
        // detect use of printf without stdio include
        const hasPrintf = /printf\s*\(/.test(code);
        const hasStdio = /#\s*include\s*<stdio.h>/.test(code);
        if (hasPrintf && !hasStdio) {
          errors.push({ type: 'ReferenceError', message: 'printf may be undeclared (missing #include <stdio.h>)' });
        }

        // detect missing semicolon at end of printf line
        const printfLineMatch = code.match(/(^.*printf\s*\([^;]*\)[ \t]*$)/m);
        if (printfLineMatch) {
          const lineText = printfLineMatch[1];
          // only if there's no trailing semicolon
          if (!/;\s*$/.test(lineText)) {
            errors.push({ type: 'SyntaxError', message: 'Missing semicolon after statement' });
          }
        }

        // detect duplicate/extra semicolons on any line (e.g. ";;")
        for (let i = 0; i < lines.length; i++) {
          if (/;;/.test(lines[i])) {
            errors.push({ type: 'SyntaxWarning', message: 'Extra semicolon detected', line: i + 1 });
          }
        }

        // detect unmatched braces (naive)
        const openBraces = (code.match(/\{/g) || []).length;
        const closeBraces = (code.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
          errors.push({ type: 'SyntaxError', message: 'Unmatched braces' });
        }

        if (errors.length === 0) {
          sendJSON(res, 200, {
            status: 'success',
            message: 'Mock compilation succeeded',
            tokens: [
              { type: 'keyword', value: 'int', line: 1 },
              { type: 'identifier', value: 'main', line: 1 },
            ],
            errors: [],
            fixes: [],
          });
        } else {
          // generate minimal fixes following the user's MVP rules
          const fixes = generateFixes(code, errors);
          sendJSON(res, 200, {
            status: 'error',
            message: 'Mock compilation failed',
            tokens: [],
            errors: errors,
            fixes: fixes,
          });
        }
      } catch (err) {
        sendJSON(res, 400, { status: 'error', message: 'Invalid JSON' });
      }
    });
    return;
  }

  if (req.url === '/fix' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const code = payload.code || '';

        // run same heuristics used for /compile
        const errors = [];
        const hasPrintf = /printf\s*\(/.test(code);
        const hasStdio = /#\s*include\s*<stdio.h>/.test(code);
        if (hasPrintf && !hasStdio) {
          errors.push({ type: 'ReferenceError', message: 'printf may be undeclared (missing #include <stdio.h>)' });
        }
        const printfLineMatch = code.match(/(^.*printf\s*\([^;]*\)[ \t]*$)/m);
        if (printfLineMatch) {
          const lineText = printfLineMatch[1];
          if (!/;\s*$/.test(lineText)) {
            errors.push({ type: 'SyntaxError', message: 'Missing semicolon after statement' });
          }
        }
        // detect duplicate semicolons
        const lines = code.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          if (/;;/.test(lines[i])) {
            errors.push({ type: 'SyntaxWarning', message: 'Extra semicolon detected', line: i + 1 });
          }
        }
        const openBraces = (code.match(/\{/g) || []).length;
        const closeBraces = (code.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
          errors.push({ type: 'SyntaxError', message: 'Unmatched braces' });
        }

        const fixes = generateFixes(code, errors);
        // return strict JSON: { fixes: [...] }
        sendJSON(res, 200, { fixes });
      } catch (err) {
        sendJSON(res, 400, { status: 'error', message: 'Invalid JSON' });
      }
    });
    return;
  }

  // default 404
  sendJSON(res, 404, { status: 'error', message: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`Mock backend server listening on http://localhost:${PORT}`);
});

// helper: generate minimal fixes according to user's strict rules
function generateFixes(code, errors) {
  const fixes = [];
  const lines = code.split(/\r?\n/);

  // missing stdio include
  if (errors.some(e => /stdio/i.test(e.message))) {
    // propose adding include at top (minimal local change)
    fixes.push({
      description: 'Add #include <stdio.h> at the top to declare printf',
      confidence: 0.9,
      // minimal edit: insert at start
      edit: {
        type: 'insert',
        line: 1,
        content: '#include <stdio.h>\n'
      }
    });
  }

  // missing semicolon
  if (errors.some(e => /semicolon/i.test(e.message))) {
    // find printf line without semicolon
    for (let i = 0; i < lines.length; i++) {
      if (/printf\s*\([^;]*\)\s*$/.test(lines[i])) {
        const original = lines[i];
        const replacement = original + ';';
        fixes.push({
          description: 'Add missing semicolon to end of statement',
          confidence: 0.95,
          edit: {
            type: 'replace',
            line: i + 1,
            original: original,
            replacement: replacement
          }
        });
        break;
      }
    }
  }

  // unmatched braces
  if (errors.some(e => /brace/i.test(e.message))) {
    // if more opens than closes, add closing brace at end
    const open = (code.match(/\{/g) || []).length;
    const close = (code.match(/\}/g) || []).length;
    if (open > close) {
      fixes.push({
        description: 'Add missing closing brace at end of file',
        confidence: 0.85,
        edit: {
          type: 'insert',
          line: lines.length + 1,
          content: '\n}'
        }
      });
    } else if (close > open) {
      // if too many closes, this is risky; suggest removing the extra close near the end
      for (let i = lines.length - 1; i >= 0; i--) {
        if (/\}/.test(lines[i])) {
          fixes.push({
            description: 'Remove an extra closing brace',
            confidence: 0.6,
            edit: {
              type: 'replace',
              line: i + 1,
              original: lines[i],
              replacement: ''
            }
          });
          break;
        }
      }
    }
  }

  // handle extra semicolon fixes
  if (errors.some(e => /extra semicolon|duplicate/i.test(e.message))) {
    // find first line with ';;' and suggest removing the extra semicolon
    for (let i = 0; i < lines.length; i++) {
      if (/;;/.test(lines[i])) {
        const original = lines[i];
        const replacement = original.replace(/;;/, ';');
        fixes.push({
          description: 'Remove extra semicolon',
          confidence: 0.9,
          edit: {
            type: 'replace',
            line: i + 1,
            original: original,
            replacement: replacement
          }
        });
        break;
      }
    }
  }

  return fixes;
}
