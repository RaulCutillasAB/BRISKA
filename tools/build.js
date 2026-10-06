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
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'briska.html');
fs.writeFileSync(out, html);
console.log('OK', out, (fs.statSync(out).size / 1024).toFixed(1) + ' KB');
