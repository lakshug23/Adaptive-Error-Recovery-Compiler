from error_handler import log_error

def run_parser(tokens):
    print("Running Parser...")
    if not tokens:
        print("No tokens to parse.")
        return

    errors_found = False

    # Rule 1: Check for missing semicolon after assignments or printf
    for i in range(len(tokens) - 1):
        token_type, token_value, line = tokens[i]
        next_token = tokens[i + 1]

        if token_value == '=':
            # Look for a semicolon after 2 tokens
            if i + 2 < len(tokens):
                future = tokens[i + 2]
                if future[1] != ';':
                    log_error(line, "Missing semicolon after assignment.")
                    errors_found = True

        if token_value == 'printf':
            if i + 3 < len(tokens):
                end_tok = tokens[i + 3]
                if end_tok[1] != ';':
                    log_error(line, "Missing semicolon after printf statement.")
                    errors_found = True

    # Rule 2: Check for unmatched braces
    stack = []
    for token_type, token_value, line in tokens:
        if token_value == '{':
            stack.append(line)
        elif token_value == '}':
            if stack:
                stack.pop()
            else:
                log_error(line, "Unmatched closing brace.")
                errors_found = True

    if stack:
        for line in stack:
            log_error(line, "Missing closing brace for '{'.")
        errors_found = True

    if not errors_found:
        print("Parsing complete.")
