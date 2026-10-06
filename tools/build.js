// Genera dist/briska.html: el juego completo en un único archivo HTML autocontenido.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => `<style>\n${fs.readFileSync(path.join(root, href), 'utf8')}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  const code = fs.readFileSync(path.join(root, src), 'utf8');
  if (code.includes('</script')) throw new Error('</script> dentro de ' + src);
  return `<script>\n${code}\n</script>`;
});
html = html.replace(/<link rel="manifest"[^>]*>\n?/, '').replace(/<link rel="apple-touch-icon"[^>]*>\n?/, '');
html = html.replace('<head>', '<head>\n<script>window.__BRISKA_SINGLE__ = true;</script>');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'briska.html');
fs.writeFileSync(out, html);
console.log('OK', out, (fs.statSync(out).size / 1024).toFixed(1) + ' KB');
// variante sin envoltorio <html>/<head>/<body> (para incrustar en páginas que ya lo aportan)
const frag = html.replace(/<!doctype html>\s*/i, '').replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*/i, '')
  .replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '').replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '')
  .replace(/<meta charset="utf-8">\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
const titleFirst = frag.replace(/<title>[^<]*<\/title>\s*/, '');
const fragOut = path.join(root, 'dist', 'briska-embed.html');
fs.writeFileSync(fragOut, '<title>Briska</title>\n' + titleFirst);
console.log('OK', fragOut);
