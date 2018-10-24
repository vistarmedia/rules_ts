const {work} = require('io_bazel_rules_js/js/tools/persistent_worker');

const {compile} = require('./compiler');


work(async (arg, inputs) => await compile(JSON.parse(arg), inputs))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.stack);
    process.exit(1);
  });
