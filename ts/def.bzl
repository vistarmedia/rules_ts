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
  npm_install(
    name = 'typescript',
    version = '2.8.1',
    sha256 = '9b32bd684e935101f00bea2e290879b2a0600c12d068751b8f9c92daddb42224',
  )

  npm_install(
    name = 'tslib',
    version = '1.7.1',
    sha256 = 'fd55589e34e9fcf38e4ec84952e3e6b6c39b2f069f8a4978893676048139ea1d',
  )


def ts_library(name, package=None, **kwargs):
  src_name = name + '.src'
  deps     = kwargs.get('deps', []) + ['@tslib//:lib']
  ts_srcs(name=src_name, **kwargs)

  js_library(
    name = name,
    srcs = [src_name],
    ts_defs = src_name,
    deps = deps,
    package = package,
    visibility = kwargs.get('visibility'),
    testonly = kwargs.get('testonly', False),
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
  requires = kwargs.pop('requires', [])
  compile_deps = deps + ['@mocha//:lib']

  ts_srcs(
    name        = src_name,
    declaration = False,
    srcs        = kwargs.pop('srcs', []),
    deps        = compile_deps,
    testonly    = True,
    **kwargs)

  js_test(
    name = name,
    srcs = [src_name],
    deps = deps,
    requires = requires,
    **js_test_args)
