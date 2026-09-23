/**
 * 包体积守卫：统计 dist/assets 下 JS/CSS 的 gzip 体积，
 * JS 超过预算（300 kB）即以非零码退出，防止依赖膨胀回归（CI 在 build 后调用）。
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const BUDGET_JS_BYTES = 300 * 1024

const dir = path.join('dist', 'assets')
if (!fs.existsSync(dir)) {
  console.error('dist/assets not found - run build first')
  process.exit(1)
}

let js = 0
let css = 0
for (const f of fs.readdirSync(dir)) {
  const size = zlib.gzipSync(fs.readFileSync(path.join(dir, f))).length
  if (f.endsWith('.js')) js += size
  else if (f.endsWith('.css')) css += size
}

const fmt = (b) => (b / 1024).toFixed(1) + ' kB'
console.log('gzip  JS ' + fmt(js) + '  CSS ' + fmt(css))

if (js > BUDGET_JS_BYTES) {
  console.error('FAIL: JS gzip ' + fmt(js) + ' exceeds budget ' + fmt(BUDGET_JS_BYTES))
  process.exit(1)
}
console.log('OK: within ' + fmt(BUDGET_JS_BYTES) + ' JS gzip budget')
