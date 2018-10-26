load("@io_bazel_rules_js//js:def.bzl", "js_binary", "js_library", "js_test")

js_library(
    name = "compiler",
    srcs = [
        "compiler_host.js",
        "index.js",
        "lru.js",
        "resolver.js",
        "strict_deps.js",
    ],
    visibility = ["//visibility:public"],
    deps = [
        "@io_bazel_rules_js//js/tools/jsar",
        "@node//:lib",
        "@typescript//:lib",
    ],
)

js_test(
    name = "test",
    size = "small",
    srcs = [
        "lru_spec.js",
        "resolver_spec.js",
    ],
    deps = [
        ":lib",
        "@chai//:lib",
    ],
)
