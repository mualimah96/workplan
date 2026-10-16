/**
 * Bangun subset ikon Lucide → js/icons.js (hanya ikon yang dipakai, ±20 KB, bukan ±350 KB).
 * Pakai (opsional, hanya bila menambah ikon baru):
 *   npm i lucide-static && node tools/build-icons.js
 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dir = process.env.LUCIDE_DIR || path.join(root, 'node_modules/lucide-static/icons');
const files = ['index.html'].concat(fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js') && f !== 'icons.js').map(f => 'js/' + f));
const src = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const EXTRA = ['brush', 'smartphone', 'users', 'folder', 'tag', 'phone', 'message-circle', 'mail', 'map-pin', 'notebook-pen', 'graduation-cap', 'hand-heart', 'megaphone', 'presentation', 'party-popper', 'rocket'];
const names = new Set(EXTRA);
for (const m of src.matchAll(/'([a-z][a-z0-9]*(?:-[a-z0-9]+)*)'/g)) if (fs.existsSync(path.join(dir, m[1] + '.svg'))) names.add(m[1]);
const icons = {};
for (const n of [...names].sort()) icons[n] = fs.readFileSync(path.join(dir, n + '.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s+/g, ' ').trim();
fs.writeFileSync(path.join(root, 'js/icons.js'), '/* Subset ikon Lucide (ISC License, lucide.dev) — dibangun oleh tools/build-icons.js */\nwindow.ICONS=' + JSON.stringify(icons) + ';\n');
console.log(names.size + ' ikon →', (fs.statSync(path.join(root, 'js/icons.js')).size / 1024).toFixed(1) + ' KB');
