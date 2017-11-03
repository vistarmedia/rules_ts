# Typescript Rules
Create Javascript sources, `js_library` and `js_binary` implementations from
Typescript sources. For more information on the specifics of these rules, how
they chain together, or npm dependencies, see the JS build rules.

## Rules
There are three public rules

    ```python
    load('@io_bazel_rules_ts//ts:def.bzl',
      'ts_srcs',
      'ts_library',
      'ts_binary')

    # Generates a .js and .d.ts file for each input .ts or .tsx file. This rule
    # doesn't integrate with the js tools, and is generally discouraged. It's
    # here if you need it, though.
    ts_srcs(
      name = 'srcs',
      srcs = [
        'party.ts',
      ]
    )

    # Generates a `js_library` with included type information
    ts_library(
      name = 'lib',
      srcs = [
        'party.ts',
      ],
      deps = [
        '@immutable//:lib',
      ],
    )

    # Generates a `js_binary` with included type information
    ts_binary(
      name = 'bin',
      srcs = [
        'main.ts',
      ],
      deps = [
        ':lib',
        '//some/javascript:library',
        '@react//:lib',
      ],
    )
    ```

## Typescript transformations
Typescript exposes a [transformation
API](https://github.com/Microsoft/TypeScript/issues/13764) where functions can
transform the AST either before or after the TypeScript compilation. `ts_*`
targets can accept these transforms as the attributes `transform_before` and
`transform_after`.

Transformations **must** be defined as the default function exported from an
index file (index.js, index.ts, index.tsx).
