from lexer import run_lexer
from syntax_parser import run_parser
from error_handler import show_errors, clear_error_log

print("Adaptive Error Recovery Compiler Starting...\n")

# Reset previous logs
clear_error_log()
print("\n[System] Cleared old error log for fresh analysis.\n")

print("All core modules found.\n")

# === Run Lexer ===
print("=== Running Lexer ===")
tokens = run_lexer()

# === Run Parser ===
print("\n=== Running Parser ===")
run_parser(tokens)

# === Display Errors ===
print("\n=== Displaying Logged Errors ===")
show_errors()
