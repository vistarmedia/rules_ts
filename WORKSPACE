workspace(name='io_bazel_rules_ts')

http_archive(
  name = 'io_bazel_rules_go',
  url = 'https://github.com/bazelbuild/rules_go/archive/561efc61f3daa04ad16ff6f75908a88d48c01bb5.tar.gz',
  strip_prefix = 'rules_go-561efc61f3daa04ad16ff6f75908a88d48c01bb5',
  sha256 = 'd9b942ba688434c67188dbcbde02156c76266d353103b974acee2ab00d8553fe',
)
load('@io_bazel_rules_go//go:def.bzl',
  'go_rules_dependencies',
  'go_register_toolchains')
go_rules_dependencies()
go_register_toolchains()

http_archive(
  name = 'io_bazel_rules_js',
  url = 'https://github.com/vistarmedia/rules_js/archive/44d0662203ef3d0dbdce851f45cee4fbe9f07f9e.tar.gz',
  strip_prefix = 'rules_js-44d0662203ef3d0dbdce851f45cee4fbe9f07f9e',
  sha256 = '4aeaaf65b8242cc3467d27e512de4fbc5b1e52f6a94df0e798f36ac7fca44877',
)
load('@io_bazel_rules_js//js:def.bzl', 'js_repositories')
js_repositories()


load('//ts:def.bzl', 'ts_repositories')
ts_repositories()
