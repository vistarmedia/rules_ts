load("//ts:def.bzl", "ts_binary", "ts_library")

ts_library(
    name = "lib",
    srcs = ["lib.ts"],
)

ts_binary(
    name = "bin",
    src = "bin.ts",
    deps = [":lib"],
)
