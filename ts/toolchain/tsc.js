const {work} = require('com_vistarmedia_rules_js/js/tools/persistent_worker');

const {compile} = require('./compiler');


work(async (arg, inputs) => {
  // Log a warning if compilation phases take more than 13 seconds cumulative
  const perfMaxMs = 13000;
  return await compile(JSON.parse(arg), inputs, perfMaxMs);
}).catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
