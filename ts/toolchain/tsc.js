const {work} = require('io_bazel_rules_js/js/tools/persistent_worker');

const {compile} = require('./compiler');


work(async (arg, inputs) => await compile(JSON.parse(arg), inputs))
.catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
