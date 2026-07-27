const fs = require('fs')
const path = String.raw`C:\Users\Michel Tadesse\Documents\Road Runner\apps\customer\src\App.tsx`
let text = fs.readFileSync(path, 'utf8')
const start = text.indexOf('const pharmacies: Pharmacy[] = [')
const end = text.indexOf('function Icon(')
if (start < 0 || end < 0) throw new Error(`markers not found ${start} ${end}`)
const replacement = `function categoryUniqueCount(products: Product[], categoryId: string) {
  const names = products
    .filter((p) => categoryId === 'all' || p.category === categoryId)
    .map((p) => p.name)
  return new Set(names).size
}

function Icon(`
fs.writeFileSync(path, text.slice(0, start) + replacement + text.slice(end + 'function Icon('.length))
console.log('ok', start, end)
