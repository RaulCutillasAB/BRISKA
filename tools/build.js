// Genera dist/lazo.html (archivo único) y dist/lazo-embed.html (sin envoltorio html/head/body)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, h) => `<style>\n${fs.readFileSync(path.join(root, h), 'utf8')}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, s) => { const c = fs.readFileSync(path.join(root, s), 'utf8'); if (c.includes('</script')) throw new Error(s); return `<script>\n${c}\n</script>`; });
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'lazo.html'), html);
const frag = html.replace(/<!doctype html>\s*/i, '').replace(/<\/?html[^>]*>\s*/gi, '').replace(/<\/?head>\s*/gi, '').replace(/<\/?body>\s*/gi, '')
  .replace(/<meta charset="utf-8">\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
fs.writeFileSync(path.join(root, 'dist', 'lazo-embed.html'), frag);
console.log('OK', (fs.statSync(path.join(root, 'dist', 'lazo.html')).size / 1024).toFixed(1) + ' KB');
