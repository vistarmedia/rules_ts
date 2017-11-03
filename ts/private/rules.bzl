load('@io_bazel_rules_js//js/private:rules.bzl',
  'js_dep_attr',
  'jsar_attr',
  'node_attr',
  'transitive_jsars')

load('//ts/private:flags.bzl', 'tsc_attrs', 'tsc_flags')


ts_src_type = FileType(['.ts', '.tsx'])
ts_def_type = FileType(['.d.ts'])

def _extract_dependencies(ctx):
  cmds   = []
  deps   = list(transitive_jsars(
    ctx.attr.deps + \
    ctx.attr.transform_before + \
    ctx.attr.transform_after))

  # First, make sure all dependent jsars are extracted into the working
  # directory. If `allow_relative` is set, they will be expanded into the root
  # (making the library and source code all at the same level). Otherwise,
  # library code is expanded into ./node_modules, so that relative imports
  # outside of the current module will not work.
  if ctx.attr.allow_relative:
    expand_into = '.'
    cmds.append('ln -s . ./node_modules')
    cmds.append('trap "{ rm ./node_modules ; }" EXIT')
  else:
    expand_into = './node_modules'
    cmds.append('mkdir ./node_modules')
    cmds.append('trap "{ rm -rf ./node_modules ; }" EXIT')

  if deps:
    cmds.append(' '.join([
      ctx.executable._jsar.path,
      'unbundle',
      '-output', expand_into
    ] + [
      dep.path for dep in deps
    ]))

  return cmds, deps + [ctx.executable._jsar]

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
  inputs  = srcs + list(ts_defs) + [ctx.file._tsc_lib]
  outputs = []
  cmds    = ['set -eu -o pipefail']

  declaration = ctx.attr.declaration

  extract_cmds, extract_inputs = _extract_dependencies(ctx)
  cmds   += extract_cmds
  inputs += extract_inputs

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
    outputs.append(ctx.new_file(js_src))

    if declaration:
      ts_def = name + '.d.ts'
      outputs.append(ctx.new_file(ts_def))

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
    '--outDir', bin_dir,
  ]

  if declaration:
    tsc_args.append('--declaration')

  tsc_args += tsc_flags(ctx.attr)
  tsc_args += [ts_def.path for ts_def in ts_defs]
  tsc_args += [src.path for src in srcs]

  tsc_opts = struct(
    args         = tsc_args,
    transformers = struct(
      before = [_plugin_path(t) for t in ctx.attr.transform_before],
      after  = [_plugin_path(t) for t in ctx.attr.transform_after],
    )
  )
  cmds.append("%s '%s'" % (ctx.executable._tsc.path, tsc_opts.to_json()))

  ctx.action(
    command  = ' && \n'.join(cmds),
    inputs   = inputs,
    outputs  = outputs,
    mnemonic = 'CompileTS',
  )

  # Nuke ./node_modules. If your OS sandboxing support is a creep and/or
  # crumbum, execution may never reach this command, and you could end up with a
  # dangling `./node_modules` directory. It doesn't appear that we can trap
  # exits with Bazel arguments, so this might be better suited for an external
  # command that unpacks jsars, executes the command, cleans up, and exits with
  # the command's exit code.
  cmds.append('rm -rf ./node_modules')

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


attrs = tsc_attrs + {
  'ts_defs': attr.label_list(allow_files=ts_def_type),
  'deps':    js_dep_attr,

  'transform_before': js_dep_attr,
  'transform_after':  js_dep_attr,

  # Allows importing across module boundaries using relative imports
  'allow_relative': attr.bool(default=False),

  'tsc_config': attr.label(mandatory=False, providers=['tsc_flags']),

  '_node': node_attr,

  '_tsc': attr.label(
    default     = Label('@io_bazel_rules_ts//ts/toolchain:tsc'),
    executable = True,
    cfg        = 'host'),

  '_tsc_lib': attr.label(
    default     = Label('@typescript//:lib/lib.d.ts'),
    allow_files = True,
    single_file = True),

  '_jsar': jsar_attr,
}

ts_srcs = rule(
  _ts_srcs_impl,
  attrs = attrs + {
    'srcs':         attr.label_list(allow_files=ts_src_type),
    'declaration':  attr.bool(default=True),
  }
)

ts_src = rule(
  _ts_src_impl,
  attrs = attrs + {
    'src':          attr.label(allow_files=ts_src_type, single_file=True),
    'declaration':  attr.bool(default=False),
  }
)

tsc_config = rule(_tsc_config_impl, attrs = tsc_attrs)
