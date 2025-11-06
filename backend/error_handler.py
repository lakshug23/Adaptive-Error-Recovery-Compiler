import os

ERROR_LOG_FILE = "error_log.txt"

def log_error(line, message):
    with open(ERROR_LOG_FILE, "a") as file:
        file.write(f"Line {line}: {message}\n")

def show_errors():
    if not os.path.exists(ERROR_LOG_FILE):
        print("No error log found.")
        return

    with open(ERROR_LOG_FILE, "r") as file:
        errors = file.readlines()

    if errors:
        for err in errors:
            print(err.strip())
        print("\n[Adaptive Suggestion]")
        print("Try checking syntax near the indicated line(s). Each statement should end with a semicolon, and braces must match.")
    else:
        print("No errors recorded yet. Clean run!")

def clear_error_log():
    open(ERROR_LOG_FILE, "w").close()
