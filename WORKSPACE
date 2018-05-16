workspace(name='io_bazel_rules_ts')

git_repository(
  name = 'io_bazel_rules_go',
  remote = 'https://github.com/bazelbuild/rules_go.git',
  commit = '561efc61f3daa04ad16ff6f75908a88d48c01bb5'
)
load('@io_bazel_rules_go//go:def.bzl',
  'go_rules_dependencies',
  'go_register_toolchains')
go_rules_dependencies()
go_register_toolchains()

git_repository(
  name = 'io_bazel_rules_js',
  remote = 'https://github.com/vistarmedia/rules_js',
  commit = '44d0662203ef3d0dbdce851f45cee4fbe9f07f9e',
)
load('@io_bazel_rules_js//js:def.bzl', 'js_repositories')
js_repositories()


load('//ts:def.bzl', 'ts_repositories')
ts_repositories()
