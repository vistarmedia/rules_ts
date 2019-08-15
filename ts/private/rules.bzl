load('@com_vistarmedia_rules_js//js/private:rules.bzl',
  'js_lib_attr',
  'node_attr',
  'compile_deps',
  'runtime_deps')

load('//ts/private:flags.bzl', 'tsc_attrs', 'tsc_flags')


ts_src_type = ['.ts', '.tsx']
ts_def_type = ['.d.ts']

def _transitive_ts_defs(ctx):
  ts_defs = depset()

  for dep in ctx.attr.deps:
    ts_defs += getattr(dep, 'ts_defs', depset())

  ts_defs += getattr(ctx.files, 'ts_defs', depset())
  return depset(ts_defs, order='postorder')


def _plugin_path(plugin):
  return plugin.label.package


def _compile(ctx, srcs):
  bin_dir = ctx.configuration.bin_dir.path
  ts_defs = _transitive_ts_defs(ctx)
  inputs  = srcs + list(ts_defs)
  outputs = []

  output_jsar_format = ctx.attr.output_format == 'jsar'
  output_src_format  = not output_jsar_format
  declaration = ctx.attr.declaration

  lib = list(
    compile_deps(ctx.attr.deps) + \
    runtime_deps(ctx.attr.transform_before + ctx.attr.transform_after) + \
    runtime_deps([ctx.attr._tslib, ctx.attr._typescript])
  )

  inputs += lib

  # For each input file, expect it to create a corresponding .js and .d.ts file.
  # If the source is a .d.ts file, pass it to the parser, but don't expect an
  # output file
  package = ctx.label.package +'/'
  for src in srcs:
    basename = src.basename

    # Allow for sub-directories of a single module
    path = src.path
    if path.startswith(package):
      basename = path.replace(package, '', 1)

    name = basename[:basename.rfind('.')]
    js_src = name + '.js'
    if output_src_format:
      outputs.append(ctx.new_file(js_src))

    if declaration and output_src_format:
      ts_def = name + '.d.ts'
      outputs.append(ctx.new_file(ts_def))

  if output_jsar_format:
    jsar_output = ctx.new_file(ctx.label.name + '.jsar')
    outputs.append(jsar_output)
    jsar_name = jsar_output.path

  # We will either be building source files (relative to '.'), or generated
  # files (relative to the bazel-bin directory). Since it's not possible to
  # construct a typescript declaration which mixed the two files, we will assume
  # our source files are relative to '.' unless the first file starts with the
  # bazel-bin directory, then use that as the source root.
  #
  # When tsc tries to infer the source root directory, it will take the longest
  # prefix shared by all source files, which is almost always the path to the
  # module where tsc as been invoked. It likely works well for
  # compile-everything-at-once projects, but would put everything at the top
  # level in a scheme that compiles each module independently.
  root_dir = '.'
  if srcs and srcs[0].path.startswith(bin_dir):
    root_dir = bin_dir

  # Build up the command to pass node to invoke the TypeScript compiler with the
  # necessary sources
  inputs.append(ctx.executable._node)
  inputs.append(ctx.executable._tsc)

  tsc_args = [
    '--rootDir', root_dir,
    '--outDir', bin_dir if output_src_format else '/',
  ]

  if declaration:
    tsc_args.append('--declaration')

  tsc_args += tsc_flags(ctx.attr)
  tsc_args += [ts_def.path for ts_def in ts_defs]
  tsc_args += [src.path for src in srcs]

  # Provides the compiler a set of strict (non-transitive) dependencies for this
  # target. Maps each label to its jsar
  deps = [[str(dep.label), dep.cjsar.path] for dep in ctx.attr.deps]

  tsc_opts = struct(
    label = str(ctx.label),
    args  = tsc_args,
    lib   = [l.path for l in lib],
    deps  = deps,

    strict_deps         = ctx.attr.strict_deps,
    ignored_strict_deps = [str(d.label) for d in ctx.attr.ignored_strict_deps],

    transformers = struct(
      before = [_plugin_path(t) for t in ctx.attr.transform_before],
      after  = [_plugin_path(t) for t in ctx.attr.transform_after],
    ),

    output_jsar = jsar_name if output_jsar_format else None
  )

  flag_file = ctx.actions.declare_file(ctx.label.name + '.args')
  ctx.actions.write(
    output  = flag_file,
    content = tsc_opts.to_json(),
  )
  inputs += [flag_file]

  ctx.action(
    executable = ctx.executable._tsc,
    arguments  = ['--flagfile=' + flag_file.path],
    inputs     = inputs,
    outputs    = outputs,
    mnemonic   = 'CompileTS',
    execution_requirements = {'supports-workers': '1'},
  )

  if output_jsar_format:
    return struct(
      files = depset([jsar_output]),
      jsar  = jsar_output,
      cjsar = jsar_output,

      runtime_deps = runtime_deps(ctx.attr.deps),
      compile_deps = compile_deps(ctx.attr.deps),
    )
  else:
    runfiles = ctx.runfiles(collect_default=True)
    return struct(
      files    = depset(outputs),
      ts_defs  = ts_defs,
      runfiles = runfiles,
    )


def _ts_srcs_impl(ctx):
  return _compile(ctx, ctx.files.srcs)


def _ts_src_impl(ctx):
  return _compile(ctx, ctx.files.src)


def _tsc_config_impl(ctx):
  return struct(tsc_flags=ctx.attr)


attrs = dict(tsc_attrs.items() + {
  'ts_defs': attr.label_list(allow_files=ts_def_type),
  'deps':    js_lib_attr,

  'transform_before': js_lib_attr,
  'transform_after':  js_lib_attr,

  'tsc_config': attr.label(mandatory=False, providers=['tsc_flags']),

  'strict_deps': attr.bool(default=False, doc='Enable strict deps -- unsued ' +\
                  'dependencies and transitive imports will fail the target.'),

  'ignored_strict_deps': attr.label_list(default=[], doc='Dependencies ' +\
                  'which should not be checked for strictness'),

  'output_format': attr.string(default='source', values=['source', 'jsar'],
    doc = 'Determines if the output will be a source files as a js_library ' +\
          'or a packaged jsar. The default is source, as its far easier to ' +\
          'debug despite a slight increase in compilation time. Note that ' +\
          'in situations where the output files of a ts_src compilation ' +\
          'cannot be known at analyze time, this can be a hand escape hatch'),

  '_node': node_attr,

  '_tsc': attr.label(
    default     = Label('@io_bazel_rules_ts//ts/toolchain:tsc'),
    executable = True,
    cfg        = 'host'),

  '_tslib': attr.label(default = Label('@tslib//:lib')),
  '_typescript': attr.label(default = Label('@typescript//:lib')),
}.items())

ts_srcs = rule(
  _ts_srcs_impl,
  attrs = dict(attrs.items() + {
    'srcs':         attr.label_list(allow_files=ts_src_type),
    'declaration':  attr.bool(default=True),
  }.items())
)

ts_src = rule(
  _ts_src_impl,
  attrs = dict(attrs.items() + {
    'src':          attr.label(allow_single_file=ts_src_type),
    'declaration':  attr.bool(default=False),
  }.items())
)

tsc_config = rule(_tsc_config_impl, attrs = tsc_attrs)
