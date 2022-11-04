load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@bazel_tools//tools/build_defs/repo:utils.bzl", "maybe")

workspace(name = "io_bazel_rules_ts")

http_archive(
    name = "io_bazel_rules_go",
    sha256 = "099a9fb96a376ccbbb7d291ed4ecbdfd42f6bc822ab77ae6f1b5cb9e914e94fa",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_go/releases/download/v0.35.0/rules_go-v0.35.0.zip",
        "https://github.com/bazelbuild/rules_go/releases/download/v0.35.0/rules_go-v0.35.0.zip",
    ],
)

http_archive(
    name = "bazel_gazelle",
    sha256 = "de69a09dc70417580aabf20a28619bb3ef60d038470c7cf8442fafcf627c21cb",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-gazelle/releases/download/v0.24.0/bazel-gazelle-v0.24.0.tar.gz",
        "https://github.com/bazelbuild/bazel-gazelle/releases/download/v0.24.0/bazel-gazelle-v0.24.0.tar.gz",
    ],
)

maybe(
    http_archive,
    name = "bazel_skylib",
    sha256 = "2ef429f5d7ce7111263289644d233707dba35e39696377ebab8b0bc701f7818e",
    url = "https://github.com/bazelbuild/bazel-skylib/releases/download/0.8.0/bazel-skylib.0.8.0.tar.gz",
)

load(
    "@io_bazel_rules_go//go:def.bzl",
    "go_register_toolchains",
    "go_rules_dependencies",
)
load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")
load("@bazel_skylib//:workspace.bzl", "bazel_skylib_workspace")

bazel_skylib_workspace()

go_rules_dependencies()

go_register_toolchains(
    nogo = "@//:nogo_cfg",
    version = "1.19.2",
)

gazelle_dependencies()

# TODO, update this hash
http_archive(
    name = "com_vistarmedia_rules_js",
    sha256 = "f115afe5035199d6896e1c9ae739a5de29930d225416f03d28cc54d50647fac4",
    strip_prefix = "rules_js-445d45e7e1cc43805998923dbb4d39ab1dcf4137",
    url = "https://github.com/vistarmedia/rules_js/archive/445d45e7e1cc43805998923dbb4d39ab1dcf4137.zip",
)

load(
    "@com_vistarmedia_rules_js//js:def.bzl",
    "chai_repositories",
    "js_repositories",
)

js_repositories()

chai_repositories()

load("//ts:def.bzl", "ts_repositories")

ts_repositories()
