const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function () { globalThis.L = {}; for (const f of ['util', 'data', 'game', 'run']) { const p = path.join(__dirname, '..', 'js', f + '.js'); if (fs.existsSync(p)) vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: f + '.js' }); } return globalThis.L; };
