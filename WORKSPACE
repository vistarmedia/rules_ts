workspace(name='io_bazel_rules_ts')

http_archive(
    name = "io_bazel_rules_go",
    urls = ["https://github.com/bazelbuild/rules_go/releases/download/0.14.0/rules_go-0.14.0.tar.gz"],
    sha256 = "5756a4ad75b3703eb68249d50e23f5d64eaf1593e886b9aa931aa6e938c4e301",
)

http_archive(
    name = "bazel_gazelle",
    sha256 = "c0a5739d12c6d05b6c1ad56f2200cb0b57c5a70e03ebd2f7b87ce88cabf09c7b",
    urls = ["https://github.com/bazelbuild/bazel-gazelle/releases/download/0.14.0/bazel-gazelle-0.14.0.tar.gz"],
)

load("@io_bazel_rules_go//go:def.bzl",
     "go_rules_dependencies", "go_register_toolchains")
load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")
go_rules_dependencies()
go_register_toolchains()
gazelle_dependencies()

http_archive(
  name = 'io_bazel_rules_js',
  url = 'https://github.com/vistarmedia/rules_js/archive/445d45e7e1cc43805998923dbb4d39ab1dcf4137.zip',
  strip_prefix = 'rules_js-445d45e7e1cc43805998923dbb4d39ab1dcf4137',
  sha256 = 'f115afe5035199d6896e1c9ae739a5de29930d225416f03d28cc54d50647fac4',
)
load('@io_bazel_rules_js//js:def.bzl', 'js_repositories', 'chai_repositories')
js_repositories()
chai_repositories()


load('//ts:def.bzl', 'ts_repositories')
ts_repositories()
