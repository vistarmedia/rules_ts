load('@com_vistarmedia_rules_js//js:def.bzl',
  'js_binary',
  'js_library',
  'js_test',
  'npm_install')

load('@com_vistarmedia_rules_js//js/private:rules.bzl',
  'compile_deps',
  'js_lib_attr',
  'runtime_deps')

load('@io_bazel_rules_ts//ts/private:rules.bzl',
  'ts_src',
  'ts_srcs',
  _tsc_config = 'tsc_config')

tsc_config = _tsc_config

def ts_repositories(version='3.4.5'):
  ts_versions = {
    '3.4.5': '3c107fa7d3e48a750f12f503a4cd6b312ef0b03b905c5991831167d27a81a8e7',
    '3.5.1': 'ea87090c959a068a74a45337a9374d89c1b539b0044c3d998a7ec82afc8cdbe6',
  }
  ts_sha = ts_versions.get(version)
  if not ts_sha:
    fail('Invalid TS Version: %s' % version)

  npm_install(
    name = 'typescript',
    version = version,
    sha256 = ts_sha,
  )

  npm_install(
    name = 'tslib',
    version = '1.9.3',
    sha256 = '30ee942205f3981657796a5e4ef12bf1229b2eeedfa7df33e03cd7203049b62f',
  )

  # TODO: Currently relying on the host workspace to define @protobufjs

def ts_library(name, package=None, data=[], **kwargs):
  if kwargs.get('output_format') == 'jsar':
    ts_srcs(name=name, **kwargs)
  else:
    deps     = kwargs.get('deps', []) + ['@tslib//:lib']
    src_name = name + '.src'
    ts_srcs(name=src_name, **kwargs)

    js_library(
      name = name,
      srcs = [src_name],
      ts_defs = src_name,
      deps = deps,
      package = package,
      data = data,
      visibility = kwargs.get('visibility'),
      testonly = kwargs.get('testonly', False),
    )


def ts_binary(name, data=[], **kwargs):
  src_name = name + '.src'
  deps     = kwargs.get('deps', []) + ['@tslib//:lib']
  ts_src(name=src_name, **kwargs)

  js_binary(
    name = name,
    src  = src_name,
    deps = deps,
    data = data,
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
    'visibility',
  ]
  js_test_args = {}
  for arg_name in js_test_arg_names:
    if arg_name in kwargs:
      js_test_args[arg_name] = kwargs.pop(arg_name)

  deps = kwargs.pop('deps', [])
  requires = kwargs.pop('requires', [])
  compile_deps = deps + ['@mocha//:lib']

  ignored_strict_deps = kwargs.pop('ignored_strict_deps', [])
  ignored_strict_deps.append('@mocha//:lib')

  ts_srcs(
    name        = src_name,
    declaration = False,
    srcs        = kwargs.pop('srcs', []),
    deps        = compile_deps,
    testonly    = True,

    ignored_strict_deps = ignored_strict_deps,
    **kwargs)

  js_test(
    name = name,
    srcs = [src_name],
    deps = deps,
    requires = requires,
    **js_test_args)
