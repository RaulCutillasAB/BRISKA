// Carga los módulos del núcleo en Node (sin DOM)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const FILES = ['rng', 'data', 'hands', 'talismans', 'consumables', 'scoring', 'game'];
module.exports = function load() {
  globalThis.BR = {};
  for (const f of FILES) {
    const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'core', f + '.js'), 'utf8');
    vm.runInThisContext(code, { filename: f + '.js' });
  }
  return globalThis.BR;
};
