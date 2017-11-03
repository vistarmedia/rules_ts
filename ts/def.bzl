load('@io_bazel_rules_js//js:def.bzl',
  'js_binary',
  'js_library',
  'js_test',
  'npm_install')

load('@io_bazel_rules_ts//ts/private:rules.bzl',
  'ts_src',
  'ts_srcs',
  'tsc_config')


def ts_repositories():
  native.new_http_archive(
    name   = 'typescript',
    url    = 'http://registry.npmjs.org/typescript/-/typescript-2.4.2.tgz',
    sha256 = 'c39a4ab3fa03297ae4217d846a3f65512f49991526db58c488a39f8db1155937',
    strip_prefix = 'package',
    build_file_content = """
load('@bazel_tools//tools/build_defs/pkg:pkg.bzl', 'pkg_tar')

load('@io_bazel_rules_js//js/private:rules.bzl', 'jsar')
load('@io_bazel_rules_js//js:def.bzl', 'js_binary')


# Because we're in an external (`typescript`), the `js_library` is going to want
# to resolve us to `external/typescript`. Instead, build the tar by hand, and
# bless it using the `jsar` backdoor.
pkg_tar(
  name        = 'tarball',
  extension   = 'tar.gz',
  srcs        = ['package.json'] + glob(['lib/*']),
  package_dir = 'typescript',
)

jsar(
  name = 'lib',
  tar  = ':tarball',
  visibility = ['//visibility:public'],
)

exports_files([
  'lib/tsc.js',
  'lib/lib.d.ts'
], visibility=['//visibility:public'])
""",
  )

  npm_install(
    name = 'tslib',
    version = '1.7.1',
    sha256 = 'fd55589e34e9fcf38e4ec84952e3e6b6c39b2f069f8a4978893676048139ea1d',
  )


def ts_library(name, **kwargs):
  src_name = name + '.src'
  deps     = kwargs.get('deps', []) + ['@tslib//:lib']
  ts_srcs(name=src_name, **kwargs)

  js_library(
    name = name,
    srcs = [src_name],
    ts_defs = src_name,
    deps = deps,
    visibility = kwargs.get('visibility'),
  )


def ts_binary(name, **kwargs):
  src_name = name + '.src'
  deps     = kwargs.get('deps', []) + ['@tslib//:lib']
  ts_src(name=src_name, **kwargs)

  js_binary(
    name = name,
    src  = src_name,
    deps = deps,
  )


def ts_test(name, **kwargs):
  src_name = name + '.src'

  # Remote all test arguments from the compile command and pass them to only the
  # test command. See:
  # https://bazel.build/versions/master/docs/be/common-definitions.html#common-attributes-tests
  js_test_arg_names = [
    'args',
    'data',
    'flaky',
    'local',
    'reporter',
    'shared_count',
    'size',
    'timeout',
    'visibility',
  ]
  js_test_args = {}
  for arg_name in js_test_arg_names:
    if arg_name in kwargs:
      js_test_args[arg_name] = kwargs.pop(arg_name)

  deps = kwargs.pop('deps', [])
  compile_deps = deps + ['@mocha//:lib']

  ts_srcs(
    name        = src_name,
    declaration = False,
    srcs        = kwargs.pop('srcs', []),
    deps        = compile_deps,
    **kwargs)

  js_test(
    name = name,
    srcs = [src_name],
    deps = deps,
    **js_test_args)
