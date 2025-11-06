import json
import os

ERROR_LOG_FILE = "error_history.json"

def load_error_history():
    """Load error history from file."""
    if not os.path.exists(ERROR_LOG_FILE):
        return []
    with open(ERROR_LOG_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def generate_adaptive_analysis():
    """Analyze error history and display adaptive insights."""
    print("\n=== Generating Adaptive Analysis ===")

    errors = load_error_history()
    if not errors:
        print("\nNo errors recorded yet. Clean run!\n")
        return

    print("\n=== Adaptive Learning Summary ===")

    # Count frequency of each unique error
    message_counts = {}
    for e in errors:
        msg = e["message"]
        message_counts[msg] = message_counts.get(msg, 0) + 1

    for msg, count in message_counts.items():
        if count > 3:
            print(f"[Frequent Error] '{msg}' occurred {count} times.")
            if "semicolon" in msg.lower():
                print("  → Suggested Auto-Fix: Add a missing ';' at the end of the statement.")
            elif "brace" in msg.lower():
                print("  → Suggested Auto-Fix: Fix suggestion for: Unmatched '}'")
        else:
            print(f"[New Error] '{msg}' detected {count} time(s).")

    print("\nCompilation process complete.")
