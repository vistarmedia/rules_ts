load(
    "@com_vistarmedia_rules_js//js:def.bzl",
    "js_binary",
    "js_library",
    "js_test",
    "npm_install",
)
load(
    "@com_vistarmedia_rules_js//js/private:rules.bzl",
    "compile_deps",
    "js_lib_attr",
    "raw_jsar",
    "runtime_deps",
)
load(
    "@io_bazel_rules_ts//ts/private:rules.bzl",
    "ts_src",
    "ts_srcs",
    _tsc_config = "tsc_config",
)

tsc_config = _tsc_config

def ts_repositories(version = "4.9.3"):
    ts_versions = {
        "4.8.4": "8e0118a302a4930ef0799e9fb64ef0038dce546b7889603c744676afd9c93c20",
        "4.9.3": "ed523eac657b57710511e36dee0f55a223c95f14edbd8cb9bc739838355efb43",
    }
    ts_sha = ts_versions.get(version)
    if not ts_sha:
        fail("Invalid TS Version: %s" % version)

    npm_install(
        name = "typescript",
        version = version,
        sha256 = ts_sha,
    )

    npm_install(
        name = "tslib",
        version = "2.3.1",
        sha256 = "1774fefbfd64c476f33b92ae8efad1347c171ea1300720d0be036e102b8198fc",
    )

    npm_install(
        name = "adm-zip",
        version = "0.4.13",
        sha256 = "01c5b332d1f59156412783963075b3f67b58838a01717bd524b497f5eaa6d433",
    )

    # TODO: Currently relying on the host workspace to define @protobufjs

def ts_library(name, package = None, data = [], **kwargs):
    deps = kwargs.get("deps", []) + ["@tslib//:lib"]
    src_name = name + ".src"
    if kwargs.get("output_format") == "jsar":
        ts_srcs(name = src_name, package = package, **kwargs)
        raw_jsar(
            name = name,
            srcs = src_name,
            deps = deps,
            visibility = kwargs.get("visibility"),
            testonly = kwargs.get("testonly", False),
        )
    else:
        ts_srcs(name = src_name, **kwargs)

        js_library(
            name = name,
            srcs = [src_name],
            ts_defs = src_name,
            deps = deps,
            package = package,
            data = data,
            visibility = kwargs.get("visibility"),
            testonly = kwargs.get("testonly", False),
        )

def ts_binary(name, data = [], args = [], **kwargs):
    src_name = name + ".src"
    deps = kwargs.get("deps", []) + ["@tslib//:lib"]
    ts_src(name = src_name, **kwargs)

    js_binary(
        name = name,
        src = src_name,
        deps = deps,
        data = data,
        args = args,
        visibility = kwargs.get("visibility"),
    )

def ts_test(name, **kwargs):
    src_name = name + ".src"

    # Remote all test arguments from the compile command and pass them to only the
    # test command. See:
    # https://bazel.build/versions/master/docs/be/common-definitions.html#common-attributes-tests
    js_test_arg_names = [
        "args",
        "data",
        "flaky",
        "has_dom",
        "local",
        "reporter",
        "shared_count",
        "size",
        "source_map_support",
        "throw_warn",
        "visibility",
    ]
    js_test_args = {}
    for arg_name in js_test_arg_names:
        if arg_name in kwargs:
            js_test_args[arg_name] = kwargs.pop(arg_name)

    deps = kwargs.pop("deps", [])
    requires = kwargs.pop("requires", [])
    compile_deps = deps + ["@mocha//:lib"]
    debug = kwargs.pop("debug", False)

    ignored_strict_deps = kwargs.pop("ignored_strict_deps", [])
    ignored_strict_deps.append("@mocha//:lib")

    ts_srcs(
        name = src_name,
        declaration = False,
        srcs = kwargs.pop("srcs", []),
        deps = compile_deps,
        testonly = True,
        ignored_strict_deps = ignored_strict_deps,
        **kwargs
    )

    js_test(
        name = name,
        srcs = [src_name],
        deps = deps,
        requires = requires,
        debug = debug,
        **js_test_args
    )
