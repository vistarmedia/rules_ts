load("@bazel_skylib//lib:new_sets.bzl", "sets")

_tsc_flags = {

    # Allow javascript files to be compiled.
    "allow_js": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--allowJs",
    },

    # Allow default imports from modules with no default export. This does not
    # affect code emit, just typechecking.
    "allow_synthetic_default_imports": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--allowSyntheticDefaultImports",
    },

    # Do not report errors on unreachable code.
    "allow_unreachable_code": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--allowUnreachableCode",
    },

    # Do not report errors on unused labels.
    "allow_unused_labels": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--allowUnusedLabels",
    },

    # Parse in strict mode and emit "use strict" for each source file
    "always_strict": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--alwaysStrict",
    },

    # Base directory to resolve non-relative module names
    "base_url": {
        "type": "value",
        "attr": attr.string(),
        "flag": "--baseUrl",
    },

    # The character set of the input files.
    "charset": {
        "type": "value",
        "attr": attr.string(),
        "flag": "--charset",
    },

    # Report errors in .js files. Use in conjunction with --allowJs.
    "check_js": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--checkJs",
    },

    # Show diagnostic information.
    "diagnostics": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--diagnostics",
    },

    # Provide full support for iterables in for..of, spread and destructuring when
    # targeting ES5 or ES3.
    "downlevel_iteration": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--downlevelIteration",
    },

    # Emit design-type metadata for decorated declarations in source. See issue
    # #2577 for details.
    "emit_decorator_metadata": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--emitDecoratorMetadata",
    },

    # Enables experimental support for ES7 decorators.
    "experimental_decorators": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--experimentalDecorators",
    },

    # Disallow inconsistently-cased references to the same file.
    "force_consistent_casing_in_file_names": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--forceConsistentCasingInFileNames",
    },

    # Import emit helpers from 'tslib'.
    "import_helpers": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--importHelpers",
    },

    # Emit a single file with source maps instead of having a separate file.
    "inline_source_map": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--inlineSourceMap",
    },

    # Emit the source alongside the sourcemaps within a single file; requires
    # --inlineSourceMap or --sourceMap to be set.
    "inline_sources": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--inlineSources",
    },

    # Transpile each file as a separate module (similar to "ts.transpileModule").
    "isolated_modules": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--isolatedModules",
    },

    # Specify JSX code generation: 'preserve' or 'react'
    "jsx": {
        "type": "value",
        "attr": attr.string(values = ["", "preserve", "react"]),
        "flag": "--jsx",
    },

    # Specify the JSX factory function to use when targeting 'react' JSX emit,
    # e.g. 'React.createElement' or 'h'.
    "jsx_factory": {
        "type": "value",
        "attr": attr.string(),
        "flag": "--jsxFactory",
    },

    # Specify library files to be included in the compilation:  must be one/many
    # of:
    # 'es5' 'es6' 'es2015' 'es7' 'es2016' 'es2017' 'dom' 'dom.iterable'
    # 'webworker' 'scripthost' 'es2015.core' 'es2015.collection'
    # 'es2015.generator' 'es2015.iterable' 'es2015.promise' 'es2015.proxy'
    # 'es2015.reflect' 'es2015.symbol' 'es2015.symbol.wellknown'
    # 'es2016.array.include' 'es2017.object' 'es2017.sharedmemory'
    # 'es2017.string'
    "lib": {
        "type": "string_list",
        "attr": attr.string_list(),
        "flag": "--lib",
        "values": sets.make([
            "es5",
            "es6",
            "es2015",
            "es7",
            "es2016",
            "es2017",
            "dom",
            "dom.iterable",
            "webworker",
            "scripthost",
            "es2015.core",
            "es2015.collection",
            "es2015.generator",
            "es2015.iterable",
            "es2015.promise",
            "es2015.proxy",
            "es2015.reflect",
            "es2015.symbol",
            "es2015.symbol.wellknown",
            "es2016.array.include",
            "es2017.object",
            "es2017.sharedmemory",
            "es2017.string",
            "esnext.asynciterable",
        ]),
    },

    # The maximum dependency depth to search under node_modules and load
    # JavaScript files
    "max_node_module_js_depth": {
        "type": "value",
        "attr": attr.int(),
        "flag": "--maxNodeModuleJsDepth",
    },

    # Specify module code generation: 'commonjs', 'amd', 'system', 'umd' or
    # 'es2015'
    "module": {
        "type": "value",
        "attr": attr.string(
            default = "commonjs",
            values = ["", "commonjs", "amd", "system", "umd", "es2015"],
        ),
        "flag": "--module",
    },

    # Specify module resolution strategy: 'node' (Node.js) or 'classic'
    # (TypeScript pre-1.6).
    "module_resolution": {
        "type": "value",
        "attr": attr.string(values = ["", "node", "classic"]),
        "flag": "--moduleResolution",
    },

    # Specify the end of line sequence to be used when emitting files: 'CRLF'
    # (dos) or 'LF' (unix).
    "new_line": {
        "type": "value",
        "attr": attr.string(values = ["", "CRLF", "LF"]),
        "flag": "--newLine",
    },

    # Do not emit outputs if any errors were reported.
    "no_emit_on_error": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--noEmitOnError",
    },

    # Report errors for fallthrough cases in switch statement.
    "no_fallthrough_cases_in_switch": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--noFallthroughCasesInSwitch",
    },

    # Raise error on expressions and declarations with an implied 'any' type.
    "no_implicit_any": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--noImplicitAny",
    },

    # Report error when not all code paths in function return a value.
    "no_implicit_returns": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--noImplicitReturns",
    },

    # Raise error on 'this' expressions with an implied 'any' type.
    "no_implicit_this": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--noImplicitThis",
    },

    # Do not emit 'use strict' directives in module output.
    "no_implicit_use_strict": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--noImplicitUseStrict",
    },

    # Do not include the default library file (lib.d.ts).
    "no_lib": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--noLib",
    },

    # Do not add triple-slash references or module import targets to the list of
    # compiled files.
    "no_resolve": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--noResolve",
    },

    # Disable strict checking of generic signatures in function types.
    "no_strict_generic_checks": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--noStrictGenericChecks",
    },

    # Report errors on unused locals.
    "no_unused_locals": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--noUnusedLocals",
    },

    # Report errors on unused parameters.
    "no_unused_parameters": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--noUnusedParameters",
    },

    # Do not erase const enum declarations in generated code.
    "preserve_const_enums": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--preserveConstEnums",
    },

    # Stylize errors and messages using color and context. (experimental)
    "pretty": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--pretty",
    },

    # DEPRECATED. Use --jsxFactory instead.  Specifies the object invoked for
    # createElement and __spread when targeting "react" JSX emit.
    "react_namespace": {
        "type": "value",
        "attr": attr.string(),
        "flag": "--reactNamespace",
    },

    # Do not emit comments to output.
    "remove_comments": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--removeComments",
    },

    # Skip type checking of all declaration files (*.d.ts).
    "skip_lib_check": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--skipLiCheck",
    },

    # Enable all strict type checking options.  Enabling --strict enables
    # --noImplicitAny, --noImplicitThis, --alwaysStrict and --strictNullChecks.
    "strict": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--strict",
    },

    # Enable strict null checks.
    "strict_null_checks": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--strictNullChecks",
    },

    # Do not emit declarations for code that has an /** @internal */ JSDoc
    # annotation.
    "strip_internal": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--stripInternal",
    },

    # Suppress excess property checks for object literals.
    "suppress_excess_property_errors": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--suppressExcessPropertyErrors",
    },

    # Suppress noImplicitAny errors for indexing objects lacking index signatures.
    "suppress_implicit_any_index_errors": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--suppressImplicitAnyIndexErrors",
    },

    # Specify ECMAScript target version: "ES3" (default), "ES5", "ES6"/"ES2015",
    # "ES2016", "ES2017" or "ESNext".  Note: "ESNext" targets latest supported ES
    # proposed features.
    "target": {
        "type": "value",
        "attr": attr.string(),
        "flag": "--target",
    },

    # List of names of type definitions to include. See @types, –typeRoots and
    # –types for more details.
    "types": {
        "type": "value",
        "attr": attr.string(),
        "flag": "--types",
    },

    # Report module resolution log messages.
    "trace_resolution": {
        "type": "flag",
        "attr": attr.bool(),
        "flag": "--traceResolution",
    },
}

tsc_attrs = {}

def _init_tsc_attrs():
    for k, v in _tsc_flags.items():
        tsc_attrs[k] = v["attr"]

_init_tsc_attrs()

def _string_list_flag_value(flag, value):
    if not value:
        return
    valid_values = flag["values"]
    if not sets.is_subset(sets.make(value), valid_values):
        fail("\nvalue %s invalid; must be one of:\n%s\n" % (value, valid_values))
    return value

def tsc_flags(args, attrs):
    config_attr = attrs.tsc_config
    if config_attr:
        attrs = config_attr.tsc_flags

    for field, flag in _tsc_flags.items():
        value = getattr(attrs, field)
        if not value:
            continue

        flag_type = flag["type"]
        if flag_type == "flag":
            args.add(flag["flag"])
        elif flag_type == "value":
            args.add(flag["flag"], str(value))
        elif flag_type == "string_list":
            flag_value = _string_list_flag_value(flag, value)
            if flag_value:
                args.add_joined(flag["flag"], flag_value, join_with = ",")
        else:
            fail('Unknown flag type "%s"' % flag_type)
