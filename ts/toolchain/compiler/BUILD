load("@com_vistarmedia_rules_js//js:def.bzl", "js_library", "js_test")

js_library(
    name = "compiler",
    srcs = [
        "compiler_host.js",
        "index.js",
        "jsar_writer.js",
        "lru.js",
        "resolver.js",
        "strict_deps.js",
    ],
    visibility = ["//visibility:public"],
    deps = [
        "@adm.zip//:lib",
        "@com_vistarmedia_rules_js//js/tools/jsar",
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
