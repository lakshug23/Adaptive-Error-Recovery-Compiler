from flask import Flask, request, jsonify
import subprocess
import os

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({"message": "Adaptive Compiler Backend Running Successfully!"})

@app.route('/compile', methods=['POST'])
def run_compiler():
    # Expecting JSON input: { "code": "<C code here>" }
    data = request.get_json()
    code = data.get("code", "")

    if not code.strip():
        return jsonify({"error": "No C code provided."}), 400

    # Write the code to test_code.c
    with open("test_code.c", "w") as f:
        f.write(code)

    # Run the main compiler pipeline
    try:
        result = subprocess.run(
            ["python3", "main.py"],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(__file__) or None
        )

        # read error log and convert to structured errors
        errors = []
        error_log_path = os.path.join(os.path.dirname(__file__), "error_log.txt")
        if os.path.exists(error_log_path):
            with open(error_log_path, "r") as ef:
                for line in ef:
                    line = line.strip()
                    if not line:
                        continue
                    # expect: Line N: message
                    if line.lower().startswith("line"):
                        parts = line.split(":", 1)
                        if len(parts) == 2:
                            left, msg = parts
                            try:
                                line_no = int(left.strip().split()[1])
                            except Exception:
                                line_no = None
                            errors.append({"type": "Error", "message": msg.strip(), "line": line_no})
                    else:
                        errors.append({"type": "Info", "message": line})

        response = {
            "status": "success" if not errors else "error",
            "message": "Compilation succeeded" if not errors else "Compilation failed",
            "tokens": [],
            "errors": errors,
        }
        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/fix', methods=['POST'])
def suggest_fixes():
    data = request.get_json() or {}
    code = data.get("code", "")
    # Simple heuristics similar to mock server
    fixes = []
    lines = code.splitlines()

    # missing stdio include
    if "printf(" in code and "#include <stdio.h>" not in code:
        fixes.append({
            "description": "Add #include <stdio.h> at the top to declare printf",
            "confidence": 0.9,
            "edit": {"type": "insert", "line": 1, "content": "#include <stdio.h>\n"}
        })

    # missing semicolon after printf
    for i, ln in enumerate(lines):
        if "printf(" in ln and not ln.strip().endswith(";"):
            fixes.append({
                "description": "Add missing semicolon to end of statement",
                "confidence": 0.95,
                "edit": {"type": "replace", "line": i+1, "original": ln, "replacement": ln + ";"}
            })
            break

    # extra semicolons
    for i, ln in enumerate(lines):
        if ";;" in ln:
            fixes.append({
                "description": "Remove extra semicolon",
                "confidence": 0.9,
                "edit": {"type": "replace", "line": i+1, "original": ln, "replacement": ln.replace(";;", ";", 1)}
            })
            break

    return jsonify({"fixes": fixes})


if __name__ == '__main__':
    # ensure backend directory is current working directory
    os.chdir(os.path.dirname(__file__) or '.')
    app.run(host='127.0.0.1', port=8000, debug=True)
