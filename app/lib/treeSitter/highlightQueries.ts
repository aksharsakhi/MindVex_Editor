/**
 * highlightQueries.ts
 *
 * Tree-sitter S-expression (Lisp-style) highlight queries for each supported language.
 * Capture names map directly to CSS class suffixes:
 *   @keyword   → .ts-keyword
 *   @function  → .ts-function
 *   @type      → .ts-type
 *   @string    → .ts-string
 *   @comment   → .ts-comment
 *   @number    → .ts-number
 *   @operator  → .ts-operator
 *   @variable  → .ts-variable
 *   @property  → .ts-property
 *   @constant  → .ts-constant
 */

import type { SupportedLanguage } from './treeSitterParser';

export const HIGHLIGHT_QUERIES: Record<SupportedLanguage, string> = {

    java: `
    ; Keywords
    [
      "abstract" "assert" "break" "case" "catch" "class" "continue"
      "default" "do" "else" "enum" "extends" "final" "finally"
      "for" "if" "implements" "import" "instanceof" "interface"
      "new" "package" "private" "protected" "public" "return"
      "static" "super" "switch" "synchronized" "this" "throw"
      "throws" "try" "void" "while" "record" "sealed" "permits"
      "var" "yield"
    ] @keyword

    ; Types
    (type_identifier) @type
    (primitive_type) @type

    ; Methods / functions
    (method_declaration name: (identifier) @function)
    (method_invocation name: (identifier) @function)
    (constructor_declaration name: (identifier) @function)

    ; Annotations
    (annotation name: (identifier) @constant)
    (marker_annotation name: (identifier) @constant)

    ; Strings
    (string_literal) @string
    (text_block) @string
    (character_literal) @string

    ; Numbers
    (decimal_integer_literal) @number
    (decimal_floating_point_literal) @number
    (hex_integer_literal) @number
    (binary_integer_literal) @number

    ; Comments
    (line_comment) @comment
    (block_comment) @comment

    ; Operators
    ["+" "-" "*" "/" "%" "=" "==" "!=" "<" ">" "<=" ">="
     "&&" "||" "!" "&" "|" "^" "~" "<<" ">>" ">>>"
     "+=" "-=" "*=" "/=" "%=" "&=" "|=" "^=" "<<=" ">>=" ">>>="
     "->" "::" "?" ":"] @operator
  `,

    python: `
    ; Keywords
    [
      "and" "as" "assert" "async" "await" "break" "class" "continue"
      "def" "del" "elif" "else" "except" "exec" "finally" "for"
      "from" "global" "if" "import" "in" "is" "lambda" "nonlocal"
      "not" "or" "pass" "print" "raise" "return" "try" "while"
      "with" "yield" "match" "case"
    ] @keyword

    ; Functions
    (function_definition name: (identifier) @function)
    (call function: (identifier) @function)
    (call function: (attribute attribute: (identifier) @function))

    ; Types / classes
    (class_definition name: (identifier) @type)
    (type (identifier) @type)

    ; Decorators
    (decorator) @constant

    ; Strings
    (string) @string
    (concatenated_string) @string

    ; Numbers
    (integer) @number
    (float) @number
    (complex) @number

    ; Comments
    (comment) @comment

    ; Operators
    ["+" "-" "*" "/" "//" "%" "**" "=" "==" "!=" "<" ">" "<=" ">="
     "and" "or" "not" "in" "is" "->" ":=" "|"] @operator
  `,

    typescript: `
    ; Keywords
    [
      "abstract" "as" "async" "await" "break" "case" "catch" "class"
      "const" "continue" "debugger" "declare" "default" "delete" "do"
      "else" "enum" "export" "extends" "finally" "for" "from" "function"
      "get" "if" "implements" "import" "in" "instanceof" "interface"
      "keyof" "let" "namespace" "new" "of" "override" "private"
      "protected" "public" "readonly" "return" "satisfies" "set"
      "static" "super" "switch" "this" "throw" "try" "type" "typeof"
      "using" "var" "void" "while" "with" "yield"
    ] @keyword

    ; Types
    (type_identifier) @type
    (predefined_type) @type

    ; Functions
    (function_declaration name: (identifier) @function)
    (method_definition name: (property_identifier) @function)
    (call_expression function: (identifier) @function)
    (call_expression function: (member_expression property: (property_identifier) @function))
    (arrow_function) @function

    ; Strings
    (string) @string
    (template_string) @string

    ; Numbers
    (number) @number

    ; Comments
    (comment) @comment

    ; Operators
    ["+" "-" "*" "/" "%" "**" "=" "==" "===" "!=" "!==" "<" ">" "<=" ">="
     "&&" "||" "!" "??" "?." "->" "=>" "|" "&" "~" "^"
     "+=" "-=" "*=" "/=" "??=" "||=" "&&="] @operator

    ; Properties
    (property_identifier) @property
  `,

    javascript: `
    ; Keywords
    [
      "as" "async" "await" "break" "case" "catch" "class" "const"
      "continue" "debugger" "default" "delete" "do" "else" "export"
      "extends" "finally" "for" "from" "function" "get" "if" "import"
      "in" "instanceof" "let" "new" "of" "return" "set" "static"
      "super" "switch" "this" "throw" "try" "typeof" "using" "var"
      "void" "while" "with" "yield"
    ] @keyword

    ; Functions
    (function_declaration name: (identifier) @function)
    (method_definition name: (property_identifier) @function)
    (call_expression function: (identifier) @function)
    (call_expression function: (member_expression property: (property_identifier) @function))
    (arrow_function) @function

    ; Strings
    (string) @string
    (template_string) @string

    ; Numbers
    (number) @number

    ; Comments
    (comment) @comment

    ; Operators
    ["+" "-" "*" "/" "%" "**" "=" "==" "===" "!=" "!==" "<" ">" "<=" ">="
     "&&" "||" "!" "??" "?." "=>" "|" "&" "~" "^"
     "+=" "-=" "*=" "/=" "??=" "||=" "&&="] @operator

    ; Properties
    (property_identifier) @property
  `,
};
