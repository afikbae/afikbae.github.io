// No install step: the pinned, MIT-licensed renderer is included in assets/katex.
const fs = require('node:fs');
const path = require('node:path');
const katex = require('../assets/katex/katex.min.js');
const root = path.resolve(__dirname, '..');
let count = 0;
const source = fs.readFileSync(path.join(root, 'content/fdd.html'), 'utf8');
const html = source.replace(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g, (_, display, inline) => {
  count++;
  const tex = (display ?? inline).replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  try { return katex.renderToString(tex, {
    displayMode: display !== undefined, throwOnError: true, strict: 'error',
    output: 'htmlAndMathml', trust: false
  }); } catch (error) { console.error(`Expression ${count}: ${tex}\n${error.message}`); process.exit(1); }
});
fs.writeFileSync(path.join(root, 'blogs/fdd/index.html'), html);
console.log(`Rendered ${count} equations to blogs/fdd/index.html.`);
