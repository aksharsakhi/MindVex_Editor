/**
 * highlightQueries.ts
 *
 * Tree-sitter S-expression (Lisp-style) highlight queries for each supported language.
 */

import type { SupportedLanguage } from './treeSitterParser';

export const HIGHLIGHT_QUERIES: Record<SupportedLanguage, string> = {
  java: `
    [ "abstract" "assert" "break" "case" "catch" "class" "continue" "default" "do" "else" "enum" "extends" "final" "finally" "for" "if" "implements" "import" "instanceof" "interface" "new" "package" "private" "protected" "public" "return" "static" "super" "switch" "synchronized" "this" "throw" "throws" "try" "void" "while" "record" "sealed" "permits" "var" "yield" ] @keyword
    (type_identifier) @type
    (primitive_type) @type
    (method_declaration name: (identifier) @function)
    (method_invocation name: (identifier) @function)
    (constructor_declaration name: (identifier) @function)
    (annotation name: (identifier) @constant)
    (marker_annotation name: (identifier) @constant)
    (string_literal) @string
    (text_block) @string
    (character_literal) @string
    (decimal_integer_literal) @number
    (decimal_floating_point_literal) @number
    (hex_integer_literal) @number
    (binary_integer_literal) @number
    (line_comment) @comment
    (block_comment) @comment
    ["+" "-" "*" "/" "%" "=" "==" "!=" "<" ">" "<=" ">=" "&&" "||" "!" "&" "|" "^" "~" "<<" ">>" ">>>" "+=" "-=" "*=" "/=" "%=" "&=" "|=" "^=" "<<=" ">>=" ">>>=" "->" "::" "?" ":"] @operator
  `,

  python: `
    [ "and" "as" "assert" "async" "await" "break" "class" "continue" "def" "del" "elif" "else" "except" "exec" "finally" "for" "from" "global" "if" "import" "in" "is" "lambda" "nonlocal" "not" "or" "pass" "print" "raise" "return" "try" "while" "with" "yield" "match" "case" ] @keyword
    (function_definition name: (identifier) @function)
    (call function: (identifier) @function)
    (call function: (attribute attribute: (identifier) @function))
    (class_definition name: (identifier) @type)
    (type (identifier) @type)
    (decorator) @constant
    (string) @string
    (concatenated_string) @string
    (integer) @number
    (float) @number
    (complex) @number
    (comment) @comment
    ["+" "-" "*" "/" "//" "%" "**" "=" "==" "!=" "<" ">" "<=" ">=" "and" "or" "not" "in" "is" "->" ":=" "|"] @operator
  `,

  typescript: `
    [ "abstract" "as" "async" "await" "break" "case" "catch" "class" "const" "continue" "debugger" "declare" "default" "delete" "do" "else" "enum" "export" "extends" "finally" "for" "from" "function" "get" "if" "implements" "import" "in" "instanceof" "interface" "keyof" "let" "namespace" "new" "of" "override" "private" "protected" "public" "readonly" "return" "satisfies" "set" "static" "super" "switch" "this" "throw" "try" "type" "typeof" "using" "var" "void" "while" "with" "yield" ] @keyword
    (type_identifier) @type
    (predefined_type) @type
    (function_declaration name: (identifier) @function)
    (method_definition name: (property_identifier) @function)
    (call_expression function: (identifier) @function)
    (call_expression function: (member_expression property: (property_identifier) @function))
    (arrow_function) @function
    (string) @string
    (template_string) @string
    (number) @number
    (comment) @comment
    ["+" "-" "*" "/" "%" "**" "=" "==" "===" "!=" "!==" "<" ">" "<=" ">=" "&&" "||" "!" "??" "?." "->" "=>" "|" "&" "~" "^" "+=" "-=" "*=" "/=" "??=" "||=" "&&="] @operator
    (property_identifier) @property
  `,

  javascript: `
    [ "as" "async" "await" "break" "case" "catch" "class" "const" "continue" "debugger" "default" "delete" "do" "else" "export" "extends" "finally" "for" "from" "function" "get" "if" "import" "in" "instanceof" "let" "new" "of" "return" "set" "static" "super" "switch" "this" "throw" "try" "typeof" "using" "var" "void" "while" "with" "yield" ] @keyword
    (function_declaration name: (identifier) @function)
    (method_definition name: (property_identifier) @function)
    (call_expression function: (identifier) @function)
    (call_expression function: (member_expression property: (property_identifier) @function))
    (arrow_function) @function
    (string) @string
    (template_string) @string
    (number) @number
    (comment) @comment
    ["+" "-" "*" "/" "%" "**" "=" "==" "===" "!=" "!==" "<" ">" "<=" ">=" "&&" "||" "!" "??" "?." "=>" "|" "&" "~" "^" "+=" "-=" "*=" "/=" "??=" "||=" "&&="] @operator
    (property_identifier) @property
  `,

  c: `
    [ "break" "case" "const" "continue" "default" "do" "else" "enum" "extern" "for" "goto" "if" "register" "return" "sizeof" "static" "struct" "switch" "typedef" "union" "volatile" "while" ] @keyword
    (type_identifier) @type
    (primitive_type) @type
    (function_declarator declarator: (identifier) @function)
    (call_expression function: (identifier) @function)
    (string_literal) @string
    (number_literal) @number
    (comment) @comment
  `,

  cpp: `
    [ "break" "case" "catch" "class" "const" "continue" "default" "delete" "do" "else" "enum" "explicit" "export" "extern" "for" "friend" "goto" "if" "inline" "mutable" "namespace" "new" "operator" "private" "protected" "public" "register" "return" "sizeof" "static" "struct" "switch" "template" "this" "throw" "try" "typedef" "typeid" "typename" "union" "using" "virtual" "volatile" "while" ] @keyword
    (type_identifier) @type
    (primitive_type) @type
    (function_declarator declarator: (identifier) @function)
    (call_expression function: (identifier) @function)
    (string_literal) @string
    (number_literal) @number
    (comment) @comment
  `,

  go: `
    [ "break" "case" "chan" "const" "continue" "default" "defer" "else" "fallthrough" "for" "func" "go" "goto" "if" "import" "interface" "map" "package" "range" "return" "select" "struct" "switch" "type" "var" ] @keyword
    (type_identifier) @type
    (function_declaration name: (identifier) @function)
    (method_declaration name: (identifier) @function)
    (call_expression function: (identifier) @function)
    (string_literal) @string
    (int_literal) @number
    (float_literal) @number
    (comment) @comment
  `,

  rust: `
    [ "as" "async" "await" "break" "const" "continue" "crate" "dyn" "else" "enum" "extern" "false" "fn" "for" "if" "impl" "import" "in" "let" "loop" "match" "mod" "move" "mut" "pub" "ref" "return" "self" "Self" "static" "struct" "super" "trait" "true" "type" "unsafe" "use" "where" "while" ] @keyword
    (type_identifier) @type
    (function_item name: (identifier) @function)
    (call_expression function: (identifier) @function)
    (string_literal) @string
    (integer_literal) @number
    (float_literal) @number
    (line_comment) @comment
    (block_comment) @comment
  `,

  html: `
    (tag_name) @keyword
    (attribute_name) @property
    (attribute_value) @string
    (comment) @comment
  `,

  css: `
    (property_name) @property
    (value) @string
    (comment) @comment
    (tag_name) @keyword
    (class_name) @type
    (id_name) @constant
  `,

  json: `
    (pair key: (string) @property)
    (string) @string
    (number) @number
    [ "true" "false" "null" ] @constant
  `,

  yaml: `
    (block_mapping_pair key: (identifier) @property)
    (string_scalar) @string
    (integer_scalar) @number
    (float_scalar) @number
    (comment) @comment
  `,

  markdown: `
    (atx_h1_marker) @keyword
    (atx_h2_marker) @keyword
    (atx_h3_marker) @keyword
    (atx_h4_marker) @keyword
    (fenced_code_block) @string
    (link_text) @property
    (link_destination) @type
  `,

  // Placeholder for the rest to satisfy types
  php: '',
  ruby: '',
  swift: '',
  kotlin: '',
  dart: '',
  lua: '',
  shell: '',
  sql: '',
  xml: '',
  dockerfile: '',
  makefile: '',
  cmake: '',
  toml: '',
  ini: '',
  perl: '',
  r: '',
  julia: '',
  elixir: '',
  clojure: '',
  haskell: '',
  scala: '',
  erlang: '',
  fsharp: '',
  ocaml: '',
  scheme: '',
  lisp: '',
  fortran: '',
  matlab: '',
  vba: '',
  powershell: '',
  vim: '',
  latex: '',
  bibtex: '',
  graphql: '',
  proto: '',
  thrift: '',
  capnp: '',
  asn1: '',
  regex: '',
  diff: '',
  gitcommit: '',
  gitrebase: '',
  gitattributes: '',
  gitignore: '',
  dockerignore: '',
  editorconfig: '',
  eslintignore: '',
  prettierignore: '',
  npmignore: '',
  yarnignore: '',
  pnpmignore: '',
  bazel: '',
  buck: '',
  meson: '',
  ninja: '',
  gn: '',
  gnbuild: '',
  gnargs: '',
  starlark: '',
};
