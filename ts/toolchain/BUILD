load('@io_bazel_rules_js//js:def.bzl', 'js_binary')

js_binary(
  name = 'tsc',
  src  = 'tsc.js',
  deps = [
    '@tslib//:lib',
    '@typescript//:lib',
  ],
  visibility = ['//visibility:public'],
)
