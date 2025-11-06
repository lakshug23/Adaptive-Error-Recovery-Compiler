import re

def run_lexer():
    print("Running Lexer...")
    try:
        with open("test_code.c", "r") as file:
            code = file.readlines()
    except FileNotFoundError:
        print("Error: test_code.c not found!")
        return []

    token_specification = [
        ('KEYWORD', r'\b(int|float|if|else|for|while|return|printf)\b'),
        ('IDENTIFIER', r'\b[a-zA-Z_]\w*\b'),
        ('NUMBER', r'\b\d+\b'),
        ('OPERATOR', r'[+\-*/=><]'),
        ('SEPARATOR', r'[(){},;]'),
        ('STRING', r'"[^"]*"'),
        ('NEWLINE', r'\n'),
        ('SKIP', r'[ \t]+'),
        ('MISMATCH', r'.'),
    ]

    token_regex = '|'.join(f'(?P<{pair[0]}>{pair[1]})' for pair in token_specification)
    tokens = []

    for lineno, line in enumerate(code, start=1):
        for mo in re.finditer(token_regex, line):
            kind = mo.lastgroup
            value = mo.group()
            if kind == 'SKIP' or kind == 'NEWLINE':
                continue
            elif kind == 'MISMATCH':
                from error_handler import log_error
                log_error(lineno, f"Unexpected token '{value}'")
            else:
                tokens.append((kind, value, lineno))
                print((kind, value, lineno))

    print("Tokenization complete.")
    return tokens
