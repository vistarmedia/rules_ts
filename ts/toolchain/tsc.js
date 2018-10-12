const {work} = require('io_bazel_rules_js/js/tools/persistent_worker');

const {compile} = require('./compiler');


work(async (arg) => await compile(JSON.parse(arg)))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
