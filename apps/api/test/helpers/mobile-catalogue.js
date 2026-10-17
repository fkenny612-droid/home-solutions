// Loads the mobile app's serviceConfig.ts (pure data + calculateEstimate, no imports) so the API
// can generate its price table from it and tests can compare the two implementations.
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const ts = require('typescript')

const SRC = path.join(__dirname, '../../../mobile/lib/serviceConfig.ts')

function loadMobileCatalogue() {
  const js = ts.transpileModule(fs.readFileSync(SRC, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(js, { module: mod, exports: mod.exports }, { filename: SRC })
  return mod.exports
}

module.exports = { loadMobileCatalogue }
