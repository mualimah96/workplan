/* =====================================================================
   WORKPLAN — modules.js (khusus pemilik)
   • Dokumen  (gas-doc-engine)      : template → form otomatis → PDF/DOCX/XLSX ber-QR
   • Kontak   (gas-notifikasi-wa-crm): CRM Nama · Email · WhatsApp
   • Notifikasi WA/Email ke pemilik : konfigurasi, matriks pengingat, antrean
   • Migrasi Data (gas-migrasi-database): import spreadsheet lama & CSV, cadangan
   ===================================================================== */
'use strict';

function tabsLine(aktif, items, base) {
  return '<div class="tabs-line" role="tablist">' + items.map(([k, l, i]) => '<button role="tab" class="' + (aktif === k ? 'on' : '') + '" data-act="tabGo" data-href="' + base + k + '">' + ic(i, 'sm') + l + '</button>').join('') + '</div>';
}
Aksi.tabGo = el => go(el.dataset.href);
function ownerSiap(el) {
  if (S.owner) return true;
  el.innerHTML = '<div class="card mt-l"><div class="skel" style="height:28px;width:40%"></div><div class="skel mt" style="height:120px"></div></div>';
  const nama = S.route.name;
  segarkanOwner(true).then(() => { if (S.owner && S.route.name === nama) route(); });
  return false;
}
function b64ToBlob(b64, mime) { const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: mime }); }

/* =====================================================================
   DOKUMEN — Doc Engine
   ===================================================================== */
const TPL_IKON = { laporan_bulanan: ['chart-column', 'c-biru'], rekap_projek: ['folder-open', 'c-ungu'], surat_tugas: ['scroll-text', 'c-pink'], rekap_catatan: ['file-spreadsheet', 'c-hijau'], manual: ['file-text', 'c-oranye'] };
const D = { tpl: null, params: {}, isian: {}, pre: null, judul: '', keluaran: null, sibuk: false };
page('dokumen', {
  judul: 'Dokumen', owner: true,
  render(el, tab, kode, arg) {
    if (!ownerSiap(el)) return;
    tab = tab || 'buat';
    if (tab === 'buat' && kode && el._pre !== kode + '/' + arg) {
      el._pre = kode + '/' + arg;
      const t = (S.owner.tpl || []).find(x => x.kode === kode);
      if (t) { D.tpl = t.id; D.pre = null; D.isian = {}; D.params = {}; if (t.sumber === 'laporan_bulanan' && arg) D.params.bulan = arg; if ((t.sumber === 'rekap_projek' || t.sumber === 'surat_tugas') && arg) D.params.projekId = arg; setTimeout(() => prefillDok(true), 0); }
    }
    const head = '<div class="page-head"><div><div class="kick"><span class="pill blue" style="height:30px">' + ic('file-badge', 'sm') + 'Doc Engine</span><span class="pill" style="height:30px">' + ic('qr-code', 'sm') + 'QR verifikasi otomatis</span></div><h1 class="h1">Dokumen Resmi</h1><p class="lead">Terbitkan laporan kinerja, rekap projek, surat tugas liputan, dan rekap Excel dari template Google Docs/Sheets — lengkap dengan nomor otomatis &amp; QR keaslian.</p></div></div>' +
      tabsLine(tab, [['buat', 'Buat Dokumen', 'square-pen'], ['arsip', 'Arsip (' + (S.owner.dok || []).length + ')', 'history'], ['template', 'Template', 'layers']], '#/dokumen/');
    if (tab === 'arsip') return renderArsip(el, head);
    if (tab === 'template') return renderTemplate(el, head);
    renderBuat(el, head);
  }
});
function tplAktif() { return (S.owner.tpl || []).find(t => t.id === D.tpl) || null; }
function renderBuat(el, head) {
  const tpls = (S.owner.tpl || []).filter(t => t.aktif);
  const t = tplAktif();
  if (el._buat && el._buat === (t ? t.id : '-') + (D.pre ? '1' : '0') + D.sibuk + (S.owner.tpl || []).length && el.querySelector('[data-docform]')) return;   // jangan hapus isian saat render ulang
  el._buat = (t ? t.id : '-') + (D.pre ? '1' : '0') + D.sibuk + (S.owner.tpl || []).length;
  let html = head + '<div class="grid g4">' + (tpls.length ? tpls.map(x => { const [i, w] = TPL_IKON[x.sumber] || TPL_IKON.manual; return '<button class="card tpl-card hov ' + w + (t && t.id === x.id ? ' on' : '') + '" data-pilih="' + esc(x.id) + '"><span class="tpl-ic">' + ic(i, 'lg') + '</span><b style="font-size:17px">' + esc(x.nama) + '</b><span class="xs muted">' + esc(x.sumberLabel) + '</span><span class="row wrap" style="gap:4px">' + x.keluaran.map(k => '<span class="badge b-idle" style="height:22px;font-size:12px">' + k.toUpperCase() + '</span>').join('') + '</span></button>'; }).join('')
    : '<div class="card" style="grid-column:1/-1">' + kosong('layers', 'Belum ada template aktif', 'Buat template bawaan di tab Template.', '<a class="btn btn-soft mt" href="#/dokumen/template">Buka Template</a>') + '</div>') + '</div>';
  if (t) {
    const prj = [...S.prj.values()].sort((a, b) => (a.TanggalAcara < b.TanggalAcara ? 1 : -1));
    const bOpt = []; for (let i = -12; i <= 1; i++) bOpt.push(geserBulan(ymNow(), i));
    let par = '';
    if (t.sumber === 'laporan_bulanan') par = '<div class="field"><label>Bulan laporan</label><select class="sel" data-p="bulan">' + bOpt.map(y => '<option value="' + y + '" ' + ((D.params.bulan || ymNow()) === y ? 'selected' : '') + '>' + namaBulan(y) + '</option>').join('') + '</select></div>';
    else if (t.sumber === 'rekap_projek' || t.sumber === 'surat_tugas') par = '<div class="field"><label>Projek / event' + (t.sumber === 'surat_tugas' ? ' (opsional)' : ' <span class="req">*</span>') + '</label><select class="sel" data-p="projekId"><option value="">— Pilih projek —</option>' + prj.map(p => '<option value="' + esc(p.ProjekID) + '" ' + (D.params.projekId === p.ProjekID ? 'selected' : '') + '>' + esc(p.NamaProjek) + ' (' + fmtTgl(p.TanggalAcara, { pendek: true }) + ')</option>').join('') + '</select></div>';
    else if (t.sumber === 'rekap_catatan') par = '<div class="grid g3"><div class="field"><label>Dari</label><input type="date" class="in" data-p="dari" value="' + esc(D.params.dari || ymNow() + '-01') + '"></div><div class="field"><label>Sampai</label><input type="date" class="in" data-p="sampai" value="' + esc(D.params.sampai || today()) + '"></div><div class="field"><label>Kategori</label><select class="sel" data-p="kategori"><option value="">Semua</option>' + kategoriList().map(k => '<option ' + (D.params.kategori === k.nama ? 'selected' : '') + '>' + esc(k.nama) + '</option>').join('') + '</select></div></div>';
    html += '<div class="form-grid mt-l"><section class="card" data-docform><div class="card-head"><div><div class="xs b muted">' + esc(t.kode) + ' • versi ' + esc(t.versi) + '</div><h2 class="h3">' + esc(t.nama) + '</h2></div><a class="btn btn-ghost sm" target="_blank" rel="noopener" href="' + esc(t.url) + '">' + ic('external-link', 'sm') + 'Template</a></div>' +
      (par ? '<div class="stack">' + par + '<button class="btn btn-soft" data-prefill>' + ic('sparkles') + 'Isi Otomatis dari Data</button></div><div class="divider"></div>' : '') +
      (D.pre ? '<div class="stack" data-fields>' + formDok(t) + '</div>' : (par ? '<div class="info-box">' + ic('info') + '<span>Pilih parameter lalu tekan <b>Isi Otomatis</b>. Angka &amp; tabel diambil dari data WORKPLAN, kemudian bisa Anda sunting.</span></div>' : '<div class="stack" data-fields>' + formDok(t) + '</div>')) + '</section>' +
      '<aside class="stack l" style="gap:var(--gut)"><section class="card"><h3 class="t-md">Penerbitan</h3><div class="field mt"><label>Judul dokumen (arsip)</label><input class="in" data-judul maxlength="150" value="' + esc(D.judul || (D.pre && D.pre.judul) || t.nama) + '"></div>' +
      '<div class="lbl mt">Format keluaran</div><div class="stack s mt">' + t.keluaran.map(k => '<label class="cbx"><input type="checkbox" data-out="' + k + '" ' + (!D.keluaran || D.keluaran.indexOf(k) > -1 ? 'checked' : '') + '><div><b>' + k.toUpperCase() + '</b><small>' + ({ pdf: 'Untuk dicetak & dibagikan (memiliki sidik jari/hash)', docx: 'Word — bisa diedit ulang', xlsx: 'Excel — bisa diolah', png: 'Gambar' }[k] || '') + '</small></div></label>').join('') + '</div>' +
      '<div class="info-box mt small">' + ic('qr-code', 'sm') + '<span>Nomor <b>' + esc(t.formatNomor) + '</b>, tanggal, dan QR verifikasi diisi otomatis oleh server saat terbit.</span></div>' +
      '<button class="btn btn-primary block mt" data-terbit ' + (D.sibuk ? 'disabled' : '') + '>' + (D.sibuk ? ic('loader-circle', 'spin') + 'Menyusun dokumen…' : ic('file-check') + 'Terbitkan Dokumen') + '</button><p class="xs muted" style="margin:8px 0 0">Proses 10–30 detik. Anda bisa berpindah menu; hasil muncul di tab Arsip.</p></section>' +
      '<section class="card"><h3 class="t-md row">' + ic('shield-check') + 'Tanda tangan</h3><p class="small muted" style="margin:6px 0 0">Mode <b>QR verifikasi</b>: dokumen terbit dengan QR keaslian; atasan menandatangani basah setelah dicetak. Siapa pun bisa memindai QR untuk memastikan dokumen asli &amp; belum ditarik.</p></section></aside></div>';
  }
  el.innerHTML = html;
  el.querySelectorAll('[data-pilih]').forEach(b => b.onclick = () => { D.tpl = b.dataset.pilih; D.pre = null; D.isian = {}; D.params = {}; D.judul = ''; D.keluaran = null; el._pre = ''; history.replaceState(null, '', '#/dokumen/buat'); route(); const f = el.querySelector('[data-docform]'); f && f.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  el.querySelectorAll('[data-p]').forEach(x => x.onchange = () => { D.params[x.dataset.p] = x.value; });
  const pf = el.querySelector('[data-prefill]'); if (pf) pf.onclick = () => prefillDok();
  pasangFormDok(el, t);
  const tb = el.querySelector('[data-terbit]'); if (tb) tb.onclick = () => terbitkan(el);
}
function formDok(t) {
  const nilai = Object.assign({}, D.pre ? D.pre.nilai : {}, D.isian);
  return t.bidang.map(b => {
    const v = nilai[b.kunci], id = 'dk_' + b.kunci;
    const lab = '<label for="' + id + '">' + esc(b.label) + (b.wajib ? ' <span class="req">*</span>' : '') + '</label>';
    const bantu = b.bantu ? '<div class="hint">' + esc(b.bantu) + '</div>' : '';
    if (b.tipe === 'daftar') {
      const rows = Array.isArray(v) ? v : [], kol = (b.kolom || []).length ? b.kolom : [{ kunci: 'NAMA', label: 'Nama' }];
      if (rows.length > 30) return '<div class="field fw">' + lab + '<div class="info-box small">' + ic('table-2', 'sm') + ic('list', 'sm') + '<span><b>' + rows.length + ' baris</b> diambil otomatis dari data (' + kol.map(k => esc(k.label)).join(', ') + ').</span></div></div>';
      return '<div class="field fw" data-daftar="' + esc(b.kunci) + '">' + lab + bantu + '<div class="tbl-wrap"><table class="tbl daftar-tbl"><thead><tr><th style="width:44px">No</th>' + kol.map(k => '<th>' + esc(k.label) + '</th>').join('') + '<th style="width:44px"></th></tr></thead><tbody>' +
        rows.map((r, i) => '<tr><td>' + (i + 1) + '</td>' + kol.map(k => '<td><input data-c="' + esc(k.kunci) + '" value="' + esc(r[k.kunci] !== undefined ? r[k.kunci] : '') + '"></td>').join('') + '<td><button type="button" class="icon-btn" data-delrow="' + i + '" aria-label="Hapus baris">' + ic('x') + '</button></td></tr>').join('') +
        '</tbody></table></div><div class="row wrap"><button type="button" class="btn btn-soft sm" data-addrow>' + ic('plus', 'sm') + 'Tambah baris</button>' + (b.kunci === 'PETUGAS' ? '<button type="button" class="btn btn-ghost sm" data-darikontak>' + ic('users', 'sm') + 'Pilih dari Kontak</button>' : '') + '</div></div>';
    }
    let input;
    if (b.tipe === 'naskah') input = '<div class="editor-isi" id="' + id + '" contenteditable="true" data-k="' + esc(b.kunci) + '">' + (v ? String(v).replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+="[^"]*"/gi, '') : '') + '</div>';
    else if (b.tipe === 'area') input = '<textarea class="ta" id="' + id + '" data-k="' + esc(b.kunci) + '" rows="4">' + esc(v === undefined ? '' : v) + '</textarea>';
    else if (b.tipe === 'pilihan') input = '<select class="sel" id="' + id + '" data-k="' + esc(b.kunci) + '">' + (b.opsi || []).map(o => '<option ' + (o === v ? 'selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
    else input = '<input class="in" id="' + id + '" data-k="' + esc(b.kunci) + '" type="' + ({ tanggal: 'date', angka: 'number' }[b.tipe] || 'text') + '" value="' + esc(v === undefined ? '' : v) + '">';
    return '<div class="field' + (/naskah|area/.test(b.tipe) || String(v || '').length > 40 ? ' fw' : '') + '">' + lab + input + bantu + '</div>';
  }).join('') || '<div class="muted small">Template ini tidak memiliki kolom isian — semua nilai otomatis.</div>';
}
function bacaFormDok(el, t) {
  const o = {};
  if (!t) return o;
  el.querySelectorAll('[data-k]').forEach(x => { o[x.dataset.k] = x.isContentEditable ? x.innerHTML : x.value; });
  el.querySelectorAll('[data-daftar]').forEach(box => {
    const k = box.dataset.daftar, rows = [];
    box.querySelectorAll('tbody tr').forEach(tr => { const r = {}; let ada = false; tr.querySelectorAll('[data-c]').forEach(inp => { r[inp.dataset.c] = inp.value; if (inp.value.trim()) ada = true; }); if (ada) rows.push(r); });
    o[k] = rows;
  });
  t.bidang.forEach(b => { if (b.tipe === 'daftar' && o[b.kunci] === undefined && D.pre && Array.isArray(D.pre.nilai[b.kunci])) o[b.kunci] = D.pre.nilai[b.kunci]; });
  return o;
}
function pasangFormDok(el, t) {
  if (!t) return;
  const simpanIsian = () => { D.isian = bacaFormDok(el, t); const j = el.querySelector('[data-judul]'); if (j) D.judul = j.value; D.keluaran = [...el.querySelectorAll('[data-out]')].filter(x => x.checked).map(x => x.dataset.out); };
  if (el._fh) { el.removeEventListener('input', el._fh); el.removeEventListener('change', el._fh); }
  el._fh = simpanIsian;
  el.addEventListener('input', simpanIsian);
  el.addEventListener('change', simpanIsian);
  el.querySelectorAll('[data-daftar]').forEach(box => {
    box.onclick = e => {
      const add = e.target.closest('[data-addrow]'), del = e.target.closest('[data-delrow]'), dk = e.target.closest('[data-darikontak]');
      const k = box.dataset.daftar;
      if (add) { simpanIsian(); D.isian[k] = (D.isian[k] || []).concat([{}]); el._buat = ''; renderBuat(el, el.querySelector('.page-head').outerHTML + el.querySelector('.tabs-line').outerHTML); }
      if (del) { simpanIsian(); D.isian[k].splice(+del.dataset.delrow, 1); el._buat = ''; renderBuat(el, el.querySelector('.page-head').outerHTML + el.querySelector('.tabs-line').outerHTML); }
      if (dk) pilihKontak(rows => { simpanIsian(); D.isian[k] = (D.isian[k] || []).concat(rows); el._buat = ''; renderBuat(el, el.querySelector('.page-head').outerHTML + el.querySelector('.tabs-line').outerHTML); });
    };
  });
  el.querySelectorAll('.editor-isi').forEach(ed => ed.addEventListener('paste', e => {
    const html = e.clipboardData.getData('text/html'), txt = e.clipboardData.getData('text/plain');
    e.preventDefault();
    const bersih = html ? html.replace(/<(style|script|meta|link)[\s\S]*?(<\/\1>|>)/gi, '').replace(/\s(style|class|id|dir|data-[\w-]+)="[^"]*"/gi, '').replace(/<\/?(span|font|o:p)[^>]*>/gi, '') : esc(txt).replace(/\n/g, '<br>');
    document.execCommand('insertHTML', false, bersih);
  }));
}
function pilihKontak(cb) {
  const list = unpack((S.owner || {}).crm);
  if (!list.length) { toast('Belum ada kontak di CRM', 'info', { aksi: 'Buka Kontak', fn: () => go('#/kontak') }); return; }
  const m = modal({
    judul: 'Pilih petugas dari Kontak', wide: true,
    isi: '<input class="in mb" placeholder="Cari nama/segmen…" data-q autofocus><div class="stack s" data-l style="max-height:50vh;overflow:auto">' + list.map((k, i) => '<label class="cbx" data-i="' + i + '" data-s="' + esc((k.Nama + ' ' + k.Segmen + ' ' + k.Instansi).toLowerCase()) + '"><input type="checkbox" value="' + i + '"><div><b>' + esc(k.Nama) + '</b><small>' + esc([k.Segmen, k.Instansi].filter(Boolean).join(' • ')) + '</small></div></label>').join('') + '</div>',
    kaki: '<button class="btn btn-ghost" data-n>Batal</button><button class="btn btn-primary" data-y>Tambahkan</button>'
  });
  m.querySelector('[data-q]').oninput = e => { const q = e.target.value.toLowerCase(); m.querySelectorAll('[data-s]').forEach(x => { x.hidden = q && x.dataset.s.indexOf(q) < 0; }); };
  m.querySelector('[data-n]').onclick = () => m.close();
  m.querySelector('[data-y]').onclick = () => { const rows = [...m.querySelectorAll('input[type=checkbox]:checked')].map(c => { const k = list[+c.value]; return { NAMA: k.Nama, TUGAS: k.Segmen === 'Tim Liputan' ? 'Dokumentasi & liputan' : k.Segmen || 'Petugas liputan' }; }); m.close(); cb(rows); };
}
async function prefillDok(diam) {
  const t = tplAktif(); if (!t) return;
  if (t.sumber === 'rekap_projek' && !D.params.projekId) { if (!diam) toast('Pilih projek terlebih dahulu', 'warn'); return; }
  const el = $('.page[data-page="dokumen"]'), btn = el && el.querySelector('[data-prefill]');
  setBusy(btn, true, 'Mengambil data…');
  const r = await api('de.prefill', { templateId: t.id, params: D.params });
  setBusy(btn, false);
  if (!r.success) return toast('Gagal mengisi otomatis', 'err', { sub: r.message });
  D.pre = r.data; D.isian = {}; D.judul = r.data.judul;
  if (el) { el._buat = ''; if (S.route.name === 'dokumen') route(); }
  toast('Data terisi otomatis', 'ok', { sub: 'Periksa & sunting sebelum terbit.' });
}
async function terbitkan(el) {
  const t = tplAktif(); if (!t || D.sibuk) return;
  D.isian = bacaFormDok(el, t);
  const j = el.querySelector('[data-judul]'); D.judul = j ? j.value.trim() : D.judul;
  D.keluaran = [...el.querySelectorAll('[data-out]')].filter(x => x.checked).map(x => x.dataset.out);
  if (!D.keluaran.length) return toast('Pilih minimal satu format keluaran', 'warn');
  const kurang = t.bidang.filter(b => b.wajib && (() => { const v = D.isian[b.kunci] !== undefined ? D.isian[b.kunci] : D.pre && D.pre.nilai[b.kunci]; return v === undefined || v === '' || (Array.isArray(v) && !v.length); })());
  if (kurang.length) return toast('Lengkapi: ' + kurang.map(b => b.label).join(', '), 'err');
  D.sibuk = true; el._buat = ''; route();
  const tst = toast('Menyusun dokumen di Google Drive…', 'sync', { ms: 60000, sub: t.nama });
  const r = await api('de.generate', { templateId: t.id, params: D.params, isian: D.isian, judul: D.judul, keluaran: D.keluaran }, { timeout: 120000, tries: 1 });
  D.sibuk = false; tst && tst.remove();
  if (!r.success) { el._buat = ''; route(); return toast('Dokumen gagal diterbitkan', 'err', { sub: r.message, ms: 9000 }); }
  S.owner.dok = [r.data.dok].concat(S.owner.dok || []); setOwnerData(S.owner);
  D.pre = null; D.isian = {}; D.judul = '';
  toast('Dokumen terbit: ' + r.data.dok.nomor, 'ok', { sub: 'Tersimpan di Arsip & Google Drive', ms: 6000 });
  go('#/dokumen/arsip'); segarkanOwner(true);
}
function renderArsip(el, head) {
  el._buat = '';
  const q = (S.ui.dokQ || '').toLowerCase();
  const list = (S.owner.dok || []).filter(d => !q || (d.nomor + ' ' + d.judul).toLowerCase().indexOf(q) > -1);
  el.innerHTML = head + '<div class="row wrap mb"><div class="search" style="max-width:420px"><span>' + ic('search') + '</span><input data-q value="' + esc(S.ui.dokQ || '') + '" placeholder="Cari nomor atau judul…" aria-label="Cari dokumen"></div><span class="muted small">' + list.length + ' dokumen</span></div>' +
    (list.length ? '<div class="stack">' + list.map(d => { const [i, w] = TPL_IKON[((S.owner.tpl || []).find(t => t.id === d.templateId) || {}).sumber] || TPL_IKON.manual; return '<article class="card pad-s row wrap ' + w + '" style="gap:14px"><span class="tpl-ic" style="width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:var(--cb);color:var(--c)">' + ic(i, 'lg') + '</span>' +
      '<div style="flex:1;min-width:220px"><div class="row wrap" style="gap:8px"><b style="font-size:17px">' + esc(d.judul) + '</b>' + (d.status === 'TERBIT' ? '<span class="badge b-ok">' + ic('badge-check') + 'Terbit</span>' : '<span class="badge b-late">Ditarik</span>') + '</div><div class="small muted">' + esc(d.nomor) + ' • ' + fmtTgl(d.terbit, { pendek: true, jam: true }) + ' • Kode <span class="code">' + esc(d.kodeVerifikasi) + '</span></div>' + (d.status === 'DITARIK' ? '<div class="xs" style="color:var(--late)">Alasan: ' + esc(d.alasanTarik) + '</div>' : '') + '</div>' +
      '<div class="row wrap" style="gap:6px">' + d.berkas.filter(b => ['pdf', 'docx', 'xlsx', 'png'].indexOf(b.format) > -1).map(b => '<button class="btn btn-soft sm" data-unduh="' + esc(d.id) + '" data-f="' + b.format + '">' + ic('download', 'sm') + b.format.toUpperCase() + '</button>').join('') +
      '<button class="icon-btn sq" data-menudok="' + esc(d.id) + '" aria-label="Menu dokumen">' + ic('ellipsis-vertical') + '</button></div></article>'; }).join('') + '</div>'
      : '<div class="card">' + kosong('files', 'Belum ada dokumen terbit', 'Terbitkan dokumen pertama dari tab Buat Dokumen.', '<a class="btn btn-soft mt" href="#/dokumen/buat">Buat Dokumen</a>') + '</div>');
  const qi = el.querySelector('[data-q]');
  qi.oninput = debounce(() => { S.ui.dokQ = qi.value; const pos = qi.selectionStart; renderArsip(el, head); const n = el.querySelector('[data-q]'); n.focus(); n.setSelectionRange(pos, pos); }, 200);
  el.querySelectorAll('[data-unduh]').forEach(b => b.onclick = async () => {
    setBusy(b, true, '…');
    const r = await api('de.download', { id: b.dataset.unduh, format: b.dataset.f }, { timeout: 60000 });
    setBusy(b, false);
    if (!r.success) return toast('Gagal mengunduh', 'err', { sub: r.message });
    unduhBlob(b64ToBlob(r.data.base64, r.data.mime), r.data.nama);
  });
  el.querySelectorAll('[data-menudok]').forEach(b => b.onclick = () => {
    const d = (S.owner.dok || []).find(x => x.id === b.dataset.menudok); if (!d) return;
    const g = d.berkas.find(x => /^g/.test(x.format));
    menuPop(b, [
      g ? { label: 'Buka di Google Drive', ikon: 'external-link', fn: () => window.open(g.url, '_blank', 'noopener') } : null,
      { label: 'Salin link verifikasi', ikon: 'link', fn: async () => { try { await navigator.clipboard.writeText(d.urlVerifikasi); toast('Link verifikasi disalin', 'ok'); } catch (e) { toast(d.urlVerifikasi, 'info'); } } },
      { label: 'Buka halaman verifikasi', ikon: 'shield-check', fn: () => go('#/v/' + d.kodeVerifikasi) },
      d.status === 'TERBIT' ? { label: 'Tarik kembali dokumen', ikon: 'file-x', bahaya: true, fn: () => tarikDok(d) } : null
    ]);
  });
}
function tarikDok(d) {
  const m = modal({ judul: 'Tarik kembali dokumen?', isi: '<p class="small muted" style="margin-top:0"><b>' + esc(d.nomor) + '</b> — ' + esc(d.judul) + '<br>Halaman verifikasi akan menampilkan status <b>DITARIK</b>. Berkas tidak dihapus dari Drive.</p><div class="field"><label>Alasan penarikan <span class="req">*</span></label><textarea class="ta" data-a autofocus placeholder="Mis. salah data periode, diganti dokumen nomor …"></textarea></div>', kaki: '<button class="btn btn-ghost" data-n>Batal</button><button class="btn btn-danger" data-y>Tarik Dokumen</button>' });
  m.querySelector('[data-n]').onclick = () => m.close();
  m.querySelector('[data-y]').onclick = async e => {
    const alasan = m.querySelector('[data-a]').value.trim(); if (alasan.length < 5) return toast('Isi alasan minimal 5 karakter', 'warn');
    setBusy(e.currentTarget, true);
    const r = await api('de.tarik', { id: d.id, alasan }); setBusy(e.currentTarget, false);
    if (!r.success) return toast(r.message, 'err');
    d.status = 'DITARIK'; d.alasanTarik = alasan; setOwnerData(S.owner); m.close(); toast('Dokumen ditarik', 'ok'); route();
  };
}
function renderTemplate(el, head) {
  el._buat = '';
  const list = S.owner.tpl || [];
  el.innerHTML = head + '<div class="grid g2" style="align-items:start"><div class="stack">' + (list.length ? list.map(t => { const [i, w] = TPL_IKON[t.sumber] || TPL_IKON.manual; return '<article class="card ' + w + '"><div class="row top" style="gap:14px"><span class="tpl-ic" style="width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:var(--cb);color:var(--c);flex:none">' + ic(i, 'lg') + '</span><div style="flex:1;min-width:0"><div class="row between"><b style="font-size:17px">' + esc(t.nama) + '</b><button class="switch ' + (t.aktif ? 'on' : '') + '" data-aktif="' + esc(t.id) + '" aria-label="Aktifkan template"></button></div>' +
    '<div class="xs muted">' + esc(t.kode) + ' • ' + esc(t.engine.toUpperCase()) + ' • v' + esc(t.versi) + ' • ' + t.bidang.length + ' kolom isian • ' + esc(t.sumberLabel) + '</div><div class="xs muted">Nomor: <span class="code">' + esc(t.formatNomor) + '</span></div>' +
    '<div class="row wrap mt" style="gap:6px"><a class="btn btn-soft sm" target="_blank" rel="noopener" href="' + esc(t.url) + '">' + ic('square-pen', 'sm') + 'Edit Template</a><button class="btn btn-white sm" data-scan="' + esc(t.id) + '">' + ic('scan-line', 'sm') + 'Pindai Ulang</button><button class="btn btn-ghost sm" data-kolom="' + esc(t.id) + '">' + ic('sliders-horizontal', 'sm') + 'Atur Kolom</button></div></div></div></article>'; }).join('') : '<div class="card">' + kosong('layers', 'Belum ada template', 'Buat 4 template bawaan dengan satu klik.') + '</div>') +
    '<div class="row wrap"><button class="btn btn-soft" data-bawaan>' + ic('sparkles') + 'Buat Template Bawaan yang Hilang</button></div></div>' +
    '<div class="stack l" style="gap:var(--gut)"><section class="card"><h2 class="h3 row">' + ic('plus') + 'Tambah Template dari Google Drive</h2><p class="small muted">Buat dokumen di Google Docs/Sheets/Slides milik akun pemilik, tulis placeholder seperti <span class="code">{{NAMA_KEGIATAN}}</span>, lalu tempel URL-nya di sini.</p><form class="stack" data-baru><div class="field"><label>URL template</label><input class="in" name="url" placeholder="https://docs.google.com/document/d/…/edit" required></div><div class="grid g2"><div class="field"><label>Kode</label><input class="in" name="kode" maxlength="12" placeholder="SKET" required></div><div class="field"><label>Nama</label><input class="in" name="nama" maxlength="80" placeholder="Surat Keterangan"></div></div>' +
    '<div class="field"><label>Sumber data otomatis</label><select class="sel" name="sumber"><option value="manual">Isi manual</option><option value="laporan_bulanan">Rekap bulanan</option><option value="rekap_projek">Projek/Event</option><option value="rekap_catatan">Daftar catatan</option><option value="surat_tugas">Surat tugas</option></select></div><button class="btn btn-primary">' + ic('scan-line') + 'Pindai &amp; Simpan</button></form></section>' +
    '<section class="card"><h2 class="h3 row">' + ic('book-open') + 'Panduan Placeholder</h2><div class="stack s small mt">' +
    '<div><span class="code">{{KUNCI}}</span> kolom isian • <span class="code">{{TGL_ACARA}}</span> tanggal • <span class="code">{{CATATAN_X}}</span> teks panjang • <span class="code">{{ISI}}</span> naskah</div>' +
    '<div><span class="code">{{#DAFTAR}}{{NO}}</span> di baris tabel + <span class="code">{{DAFTAR.NAMA}}</span> → baris berulang</div>' +
    '<div><span class="code">{{?ISI}} … {{/ISI}}</span> → bagian hilang bila ISI kosong</div>' +
    '<div><span class="code">{{NAMA|kapital}}</span> <span class="code">{{JUMLAH|rupiah}}</span> <span class="code">{{JUMLAH|terbilang:rupiah}}</span> <span class="code">{{X|bawaan:-}}</span></div>' +
    '<div>Otomatis: <span class="code">{{NOMOR}}</span> <span class="code">{{TANGGAL}}</span> <span class="code">{{QR}}</span> <span class="code">{{KODE_VERIFIKASI}}</span> <span class="code">{{URL_VERIFIKASI}}</span> <span class="code">{{INSTITUSI_NAMA}}</span> <span class="code">{{UNIT_KERJA}}</span> <span class="code">{{KOTA}}</span> <span class="code">{{NAMA_ADMIN}}</span> <span class="code">{{ATASAN_NAMA}}</span> <span class="code">{{ATASAN_JABATAN}}</span></div></div></section></div></div>';
  const muat = r => { if (r.success && r.data.tpl) { S.owner.tpl = r.data.tpl; setOwnerData(S.owner); route(); } };
  el.querySelectorAll('[data-aktif]').forEach(b => b.onclick = async () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); const r = await api('de.templateSave', { id: b.dataset.aktif, aktif: on }); if (!r.success) { b.classList.toggle('on', !on); toast(r.message, 'err'); } else muat(r); });
  el.querySelectorAll('[data-scan]').forEach(b => b.onclick = async () => { setBusy(b, true, 'Memindai…'); const r = await api('de.scan', { templateId: b.dataset.scan }, { timeout: 60000 }); setBusy(b, false); if (!r.success) return toast('Pindai gagal', 'err', { sub: r.message }); toast(r.message, 'ok', { sub: r.data.hilang && r.data.hilang.length ? 'Kolom hilang dari template: ' + r.data.hilang.join(', ') : '' }); muat(r); });
  el.querySelectorAll('[data-kolom]').forEach(b => b.onclick = () => aturKolom((S.owner.tpl || []).find(t => t.id === b.dataset.kolom), muat));
  el.querySelector('[data-bawaan]').onclick = async e => { const btn = e.currentTarget; setBusy(btn, true, 'Membuat template…'); const r = await api('de.bawaan', {}, { timeout: 120000 }); setBusy(btn, false); if (!r.success) return toast('Gagal', 'err', { sub: r.message }); toast(r.message, 'ok'); muat(r); };
  const fb = el.querySelector('[data-baru]');
  fb.onsubmit = async e => { e.preventDefault(); const btn = fb.querySelector('.btn-primary'); setBusy(btn, true, 'Memindai…'); const r = await api('de.scan', { url: fb.url.value, kode: fb.kode.value, nama: fb.nama.value, sumber: fb.sumber.value }, { timeout: 60000 }); setBusy(btn, false); if (!r.success) return toast('Gagal menambah template', 'err', { sub: r.message }); toast(r.message, 'ok'); muat(r); };
}
function aturKolom(t, muat) {
  if (!t) return;
  const tipe = ['teks', 'area', 'naskah', 'tanggal', 'angka', 'pilihan'];
  const m = modal({
    judul: 'Atur Kolom — ' + t.nama, wide: true,
    isi: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kunci</th><th>Label</th><th>Tipe</th><th>Wajib</th><th>Bantuan / Opsi</th></tr></thead><tbody>' + t.bidang.map((b, i) => '<tr data-i="' + i + '"><td><span class="code">' + esc(b.kunci) + '</span></td><td><input class="in sm" data-l value="' + esc(b.label) + '"></td><td>' + (b.tipe === 'daftar' ? '<span class="badge b-idle">daftar</span>' : '<select class="sel sm" data-t>' + tipe.map(x => '<option ' + (b.tipe === x ? 'selected' : '') + '>' + x + '</option>').join('') + '</select>') + '</td><td><input type="checkbox" data-w ' + (b.wajib ? 'checked' : '') + ' style="width:20px;height:20px"></td><td><input class="in sm" data-b value="' + esc(b.tipe === 'pilihan' ? (b.opsi || []).join('; ') : b.bantu || '') + '" placeholder="' + (b.tipe === 'pilihan' ? 'Opsi dipisah ;' : 'Teks bantuan') + '"></td></tr>').join('') + '</tbody></table></div>' +
      '<div class="grid g2 mt"><div class="field"><label>Format nomor</label><input class="in" data-fn value="' + esc(t.formatNomor) + '"><div class="hint">Token: {URUT} {KODE} {BULAN} (romawi) {BULAN_ANGKA} {TAHUN}</div></div><div class="field"><label>Nama template</label><input class="in" data-nm value="' + esc(t.nama) + '"></div></div>',
    kaki: '<button class="btn btn-ghost" data-n>Batal</button><button class="btn btn-primary" data-y>Simpan</button>'
  });
  m.querySelector('[data-n]').onclick = () => m.close();
  m.querySelector('[data-y]').onclick = async e => {
    const bidang = [...m.querySelectorAll('tbody tr')].map(tr => { const b = t.bidang[+tr.dataset.i], ti = tr.querySelector('[data-t]'), tp = ti ? ti.value : b.tipe, bx = tr.querySelector('[data-b]').value; return { kunci: b.kunci, label: tr.querySelector('[data-l]').value, tipe: tp, wajib: tr.querySelector('[data-w]').checked, bantu: tp === 'pilihan' ? '' : bx, opsi: tp === 'pilihan' ? bx.split(';').map(s => s.trim()).filter(Boolean) : [] }; });
    setBusy(e.currentTarget, true);
    const r = await api('de.templateSave', { id: t.id, bidang, formatNomor: m.querySelector('[data-fn]').value, nama: m.querySelector('[data-nm]').value });
    setBusy(e.currentTarget, false);
    if (!r.success) return toast(r.message, 'err');
    m.close(); toast('Kolom template tersimpan', 'ok'); muat(r);
  };
}

/* =====================================================================
   KONTAK (CRM) — Nama · Email · WhatsApp
   ===================================================================== */
const CRM = { pilih: new Set() };
function hp08(v) { let s = String(v || '').replace(/[^0-9+]/g, '').replace(/^\+/, ''); if (!s) return ''; if (s.indexOf('62') === 0) s = '0' + s.slice(2); else if (s[0] === '8') s = '0' + s; return s; }
const hpOk = v => /^08\d{8,12}$/.test(hp08(v));
const emailOk = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim());
function kontakList() { return unpack((S.owner || {}).crm); }
function setKontakList(arr) { S.owner.crm = pack(arr, ['KontakID', 'Nama', 'Email', 'NoWA', 'Segmen', 'Instansi', 'Tag', 'StatusWA', 'CekWAAt', 'Catatan', 'TerakhirDihubungi', 'DibuatPada', 'DiperbaruiPada']); setOwnerData(S.owner); }
function waBadge(k) { return !k.NoWA ? '' : k.StatusWA === 'Terdaftar' ? '<span class="wa-badge ya">✓ WA</span>' : k.StatusWA === 'Tidak Terdaftar' ? '<span class="wa-badge tidak">✕ bukan WA</span>' : '<span class="wa-badge belum">? belum dicek</span>'; }
page('kontak', {
  judul: 'Kontak', owner: true,
  render(el) {
    if (!ownerSiap(el)) return;
    const all = kontakList(), f = S.ui.crm = Object.assign({ q: '', seg: '', wa: '' }, S.ui.crm || {});
    const cnt = {}; all.forEach(k => { const w = hp08(k.NoWA), e = String(k.Email).toLowerCase(); if (w) cnt['w' + w] = (cnt['w' + w] || 0) + 1; if (e) cnt['e' + e] = (cnt['e' + e] || 0) + 1; });
    const dup = k => (k.NoWA && cnt['w' + hp08(k.NoWA)] > 1) || (k.Email && cnt['e' + String(k.Email).toLowerCase()] > 1);
    const seg = {}; all.forEach(k => { seg[k.Segmen || 'Lainnya'] = (seg[k.Segmen || 'Lainnya'] || 0) + 1; });
    const q = f.q.toLowerCase();
    const list = all.filter(k => (!q || (k.Nama + ' ' + k.Email + ' ' + k.NoWA + ' ' + k.Instansi + ' ' + k.Tag).toLowerCase().indexOf(q) > -1) && (!f.seg || (k.Segmen || 'Lainnya') === f.seg) &&
      (!f.wa || (f.wa === 'ya' ? k.StatusWA === 'Terdaftar' : f.wa === 'tidak' ? k.StatusWA === 'Tidak Terdaftar' : f.wa === 'belum' ? k.NoWA && !k.StatusWA : f.wa === 'dup' ? dup(k) : !hpOk(k.NoWA) && !emailOk(k.Email)))).sort((a, b) => a.Nama.localeCompare(b.Nama, 'id'));
    const kpi = (l, v, i, w, fil) => '<button class="card kpi hov" data-fwa="' + fil + '"><div class="k-top"><span class="k-lbl">' + l + '</span><span class="k-ic ' + w + '">' + ic(i) + '</span></div><div class="k-val">' + v + '</div></button>';
    if (!el._built || el._built !== 'crm') {
      el._built = 'crm';
      el.innerHTML = '<div class="page-head"><div><div class="kick"><span class="pill blue" style="height:30px">' + ic('users', 'sm') + 'CRM Kontak</span></div><h1 class="h1">Kontak Tim &amp; Mitra</h1><p class="lead">Satu daftar Nama · Email · WhatsApp untuk tim liputan, narasumber, mitra, dan pimpinan — siap dipakai di Surat Tugas.</p></div>' +
        '<div class="acts"><button class="btn btn-primary" data-baru>' + ic('user-plus') + 'Kontak Baru</button><button class="btn btn-white" data-imp>' + ic('upload') + 'Import CSV</button><button class="btn btn-ghost" data-eks>' + ic('download') + 'Ekspor</button></div></div>' +
        '<div class="grid g5" data-part="kpi"></div><section class="card mt-l"><div class="row wrap" style="gap:10px"><div class="search" style="flex:1;max-width:none"><span>' + ic('search') + '</span><input data-q value="' + esc(f.q) + '" placeholder="Cari nama, email, nomor, instansi, tag…" aria-label="Cari kontak"></div>' +
        '<select class="sel sm" style="width:auto" data-wa aria-label="Status"><option value="">Semua status</option><option value="ya">WA terverifikasi</option><option value="belum">Belum dicek WA</option><option value="tidak">Bukan WA</option><option value="dup">Duplikat</option><option value="tak">Tak bisa dihubungi</option></select></div><div class="chips-scroll mt" data-part="seg"></div></section>' +
        '<div data-part="bulk"></div><section class="card mt" style="padding:0;overflow:hidden" data-part="tbl"></section>';
      el.querySelector('[data-q]').oninput = debounce(e => { f.q = e.target.value; Store.set('ui', S.ui); this.render(el); }, 250);
      el.querySelector('[data-wa]').onchange = e => { f.wa = e.target.value; this.render(el); };
      el.querySelector('[data-baru]').onclick = () => formKontak();
      el.querySelector('[data-imp]').onclick = () => importKontak();
      el.querySelector('[data-eks]').onclick = () => { const rows = [['Nama', 'Email', 'WhatsApp', 'Segmen', 'Instansi', 'Tag', 'Status WA', 'Terakhir Dihubungi', 'Catatan']].concat(list.map(k => [k.Nama, k.Email, k.NoWA, k.Segmen, k.Instansi, k.Tag, k.StatusWA, k.TerakhirDihubungi, k.Catatan])); unduhBlob(new Blob([csvDari(rows)], { type: 'text/csv' }), 'Workplan-Kontak.csv'); };
      el.addEventListener('click', e => {
        const fw = e.target.closest('[data-fwa]'); if (fw) { f.wa = f.wa === fw.dataset.fwa ? '' : fw.dataset.fwa; el.querySelector('[data-wa]').value = f.wa; this.render(el); }
        const sg = e.target.closest('[data-seg]'); if (sg) { f.seg = sg.dataset.seg; this.render(el); }
        const dt = e.target.closest('[data-detail]'); if (dt) detailKontak(dt.dataset.detail);
      });
      el.addEventListener('change', e => {
        const c = e.target.closest('[data-pilih]'); if (c) { if (c.checked) CRM.pilih.add(c.dataset.pilih); else CRM.pilih.delete(c.dataset.pilih); this.render(el); }
        const ca = e.target.closest('[data-semua]'); if (ca) { (ca.checked ? list.forEach(k => CRM.pilih.add(k.KontakID)) : CRM.pilih.clear()); this.render(el); }
      });
    }
    el.querySelector('[data-wa]').value = f.wa;
    part(el, 'kpi', kpi('Total Kontak', all.length, 'users', 'c-biru', '') + kpi('WA Terverifikasi', all.filter(k => k.StatusWA === 'Terdaftar').length, 'circle-check', 'c-hijau', 'ya') + kpi('Email Valid', all.filter(k => emailOk(k.Email)).length, 'mail', 'c-ungu', '') + kpi('Belum Dicek WA', all.filter(k => k.NoWA && !k.StatusWA).length, 'scan-line', 'c-oranye', 'belum') + kpi('Duplikat', all.filter(dup).length, 'copy', 'c-pink', 'dup'));
    part(el, 'seg', '<button class="fchip ' + (!f.seg ? 'on' : '') + '" data-seg="">Semua <span class="n">(' + all.length + ')</span></button>' + Object.keys(seg).sort().map(s => '<button class="fchip ' + (f.seg === s ? 'on' : '') + '" data-seg="' + esc(s) + '">' + esc(s) + ' <span class="n">(' + seg[s] + ')</span></button>').join(''));
    const nPilih = [...CRM.pilih].filter(id => all.some(k => k.KontakID === id)).length;
    part(el, 'bulk', nPilih ? '<div class="card pad-s mt row wrap" style="background:var(--primary-soft);box-shadow:none"><b>' + nPilih + ' dipilih</b><button class="btn btn-white sm" data-act="crmDeteksi">' + ic('scan-line', 'sm') + 'Deteksi WA</button><button class="btn btn-white sm" data-act="crmHapus" style="color:var(--late)">' + ic('trash-2', 'sm') + 'Hapus</button><button class="btn btn-ghost sm" data-act="crmBatal">Batal pilih</button></div>' : '');
    part(el, 'tbl', list.length ? '<div class="tbl-wrap" style="border:0;border-radius:0"><table class="tbl resp"><thead><tr><th style="width:44px"><input type="checkbox" data-semua aria-label="Pilih semua" ' + (nPilih && nPilih === list.length ? 'checked' : '') + '></th><th>Nama</th><th>Email</th><th>WhatsApp</th><th>Tag</th><th>Terakhir dihubungi</th><th></th></tr></thead><tbody>' +
      list.map(k => '<tr style="' + (dup(k) || (!hpOk(k.NoWA) && !emailOk(k.Email)) ? 'background:#FFFBEB' : '') + '"><td><input type="checkbox" data-pilih="' + esc(k.KontakID) + '" ' + (CRM.pilih.has(k.KontakID) ? 'checked' : '') + ' aria-label="Pilih ' + esc(k.Nama) + '"></td>' +
        '<td><div class="row" style="gap:10px"><span class="avatar soft">' + esc(inisial(k.Nama)) + '</span><div style="min-width:0"><b>' + esc(k.Nama) + '</b>' + (k._p ? ' ' + ic('loader-circle', 'sm spin') : '') + '<div class="xs muted">' + esc([k.Segmen, k.Instansi].filter(Boolean).join(' • ')) + '</div></div></div></td>' +
        '<td class="small">' + (k.Email ? (emailOk(k.Email) ? '' : '⚠ ') + '<a href="mailto:' + esc(k.Email) + '">' + esc(k.Email) + '</a>' : '<span class="faint">—</span>') + '</td>' +
        '<td class="small">' + (k.NoWA ? '<span class="code">' + esc(k.NoWA) + '</span> ' + waBadge(k) + ' <a class="link xs" target="_blank" rel="noopener" href="https://wa.me/' + esc(hp08(k.NoWA).replace(/^0/, '62')) + '">Chat</a>' : '<span class="faint">—</span>') + '</td>' +
        '<td class="small">' + esc(k.Tag || '') + '</td><td class="small muted">' + (k.TerakhirDihubungi ? fmtTgl(k.TerakhirDihubungi, { pendek: true }) : '—') + '</td><td><button class="btn btn-soft sm" data-detail="' + esc(k.KontakID) + '">Detail</button></td></tr>').join('') + '</tbody></table></div>'
      : '<div style="padding:24px">' + kosong('users', all.length ? 'Tidak ada kontak yang cocok' : 'Belum ada kontak', all.length ? 'Ubah kata kunci atau filter.' : 'Tambah kontak tim liputan, narasumber, dan mitra — atau import dari CSV.') + '</div>');
  }
});
Aksi.crmBatal = () => { CRM.pilih.clear(); emit(); };
Aksi.crmHapus = async () => {
  const ids = [...CRM.pilih];
  if (!(await konfirmasi({ judul: 'Hapus ' + ids.length + ' kontak?', teks: 'Kontak dan riwayat interaksinya dihapus permanen.', ok: 'Hapus', bahaya: true }))) return;
  const lama = kontakList();
  setKontakList(lama.filter(k => ids.indexOf(k.KontakID) < 0)); CRM.pilih.clear(); emit();
  const r = await api('crm.delete', { ids });
  if (!r.success) { setKontakList(lama); emit(); return toast('Gagal menghapus', 'err', { sub: r.message }); }
  toast(r.message, 'ok');
};
Aksi.crmDeteksi = async el => {
  const all = kontakList(), nomor = all.filter(k => CRM.pilih.has(k.KontakID) && hpOk(k.NoWA)).map(k => hp08(k.NoWA));
  if (!nomor.length) return toast('Tidak ada nomor valid pada pilihan', 'warn');
  if (!(S.owner.notif || {}).adaToken) return toast('Isi token Fonnte dulu', 'warn', { aksi: 'Buka', fn: () => go('#/notifikasi') });
  setBusy(el, true, 'Mengecek 0/' + nomor.length);
  for (let i = 0; i < nomor.length; i += 50) {
    const r = await api('wa.validate', { nomor: nomor.slice(i, i + 50) });
    if (!r.success) { setBusy(el, false); return toast('Deteksi WA gagal', 'err', { sub: r.message }); }
    const cur = kontakList(); cur.forEach(k => { const s = r.data.hasil[hp08(k.NoWA)]; if (s) { k.StatusWA = s; k.CekWAAt = r.data.cekPada; } }); setKontakList(cur);
    el.innerHTML = ic('loader-circle', 'spin') + 'Mengecek ' + Math.min(nomor.length, i + 50) + '/' + nomor.length;
  }
  setBusy(el, false); emit(); toast('Deteksi WhatsApp selesai', 'ok');
};
function formKontak(k0) {
  const k = Object.assign({ KontakID: '', Nama: '', Email: '', NoWA: '', Segmen: 'Tim Liputan', Instansi: '', Tag: '', Catatan: '' }, k0 || {});
  const segs = [...new Set(['Tim Liputan', 'Narasumber', 'Mitra Media', 'Pimpinan', 'Panitia', 'Lainnya'].concat(kontakList().map(x => x.Segmen).filter(Boolean)))];
  const m = modal({
    judul: k0 ? 'Ubah Kontak' : 'Kontak Baru', wide: true,
    isi: '<form class="stack" novalidate><div class="grid g2"><div class="field"><label>Nama <span class="req">*</span></label><input class="in" name="Nama" maxlength="80" value="' + esc(k.Nama) + '" autofocus></div><div class="field"><label>Segmen</label><input class="in" name="Segmen" list="dl-seg" maxlength="40" value="' + esc(k.Segmen) + '"><datalist id="dl-seg">' + segs.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist></div></div>' +
      '<div class="grid g2"><div class="field"><label>WhatsApp</label><input class="in" name="NoWA" inputmode="tel" value="' + esc(k.NoWA) + '" placeholder="0812xxxxxxxx"></div><div class="field"><label>Email</label><input class="in" name="Email" type="email" value="' + esc(k.Email) + '" placeholder="nama@kampus.ac.id"></div></div>' +
      '<div class="grid g2"><div class="field"><label>Instansi / Unit</label><input class="in" name="Instansi" maxlength="80" value="' + esc(k.Instansi) + '"></div><div class="field"><label>Tag</label><input class="in" name="Tag" maxlength="120" value="' + esc(k.Tag) + '" placeholder="fotografer, drone"></div></div>' +
      '<div class="field"><label>Catatan</label><textarea class="ta" name="Catatan" maxlength="1000">' + esc(k.Catatan) + '</textarea></div><div class="err" data-err></div></form>',
    kaki: '<button class="btn btn-ghost" data-n>Batal</button><button class="btn btn-primary" data-y>' + ic('circle-check') + 'Simpan</button>'
  });
  const f = m.querySelector('form');
  m.querySelector('[data-n]').onclick = () => m.close();
  const kirim = async () => {
    const d = { KontakID: k.KontakID, Nama: f.Nama.value.trim(), Segmen: f.Segmen.value.trim(), NoWA: f.NoWA.value.trim(), Email: f.Email.value.trim(), Instansi: f.Instansi.value.trim(), Tag: f.Tag.value.trim(), Catatan: f.Catatan.value.trim() };
    const err = m.querySelector('[data-err]');
    if (!d.Nama) { err.textContent = 'Nama wajib diisi.'; return; }
    if (d.NoWA && !hpOk(d.NoWA)) { err.textContent = 'Nomor WhatsApp tidak valid (contoh 0812xxxxxxx).'; return; }
    if (d.Email && !emailOk(d.Email)) { err.textContent = 'Email tidak valid.'; return; }
    const lama = kontakList(), tmp = d.KontakID || 'tmp_' + uid().slice(0, 8);
    const lokal = Object.assign({}, k, d, { KontakID: tmp, NoWA: hp08(d.NoWA), _p: 1 });
    setKontakList(d.KontakID ? lama.map(x => (x.KontakID === d.KontakID ? lokal : x)) : lama.concat([lokal]));
    m.close(); emit();
    const r = await api('crm.save', { kontak: d });
    if (!r.success) { setKontakList(lama); emit(); toast('Kontak gagal disimpan', 'err', { sub: r.message }); return; }
    setKontakList(kontakList().map(x => (x.KontakID === tmp ? r.data.kontak : x))); emit();
    toast('Kontak tersimpan', 'ok', { sub: d.Nama });
  };
  m.querySelector('[data-y]').onclick = kirim;
  f.onsubmit = e => { e.preventDefault(); kirim(); };
}
async function detailKontak(id) {
  const k = kontakList().find(x => x.KontakID === id); if (!k) return;
  const wa = hp08(k.NoWA).replace(/^0/, '62');
  const m = modal({
    judul: k.Nama, kick: esc(k.Segmen || 'Kontak') + ' • ' + esc(k.KontakID), wide: true,
    isi: '<div class="row wrap mb">' + (k.NoWA ? '<a class="btn btn-ok sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(wa) + '">' + ic('message-circle', 'sm') + 'WhatsApp</a>' : '') + (k.Email ? '<a class="btn btn-soft sm" href="mailto:' + esc(k.Email) + '">' + ic('mail', 'sm') + 'Email</a>' : '') + (k.NoWA ? '<button class="btn btn-ghost sm" data-salin>' + ic('copy', 'sm') + 'Salin nomor</button>' : '') + '<button class="btn btn-white sm" data-ubah>' + ic('pencil', 'sm') + 'Ubah</button></div>' +
      '<dl class="kv"><dt>WhatsApp</dt><dd>' + (k.NoWA ? esc(k.NoWA) + ' ' + waBadge(k) : '—') + '</dd><dt>Email</dt><dd>' + esc(k.Email || '—') + '</dd><dt>Instansi</dt><dd>' + esc(k.Instansi || '—') + '</dd><dt>Tag</dt><dd>' + esc(k.Tag || '—') + '</dd>' + (k.Catatan ? '<dt>Catatan</dt><dd style="white-space:pre-line">' + esc(k.Catatan) + '</dd>' : '') + '</dl>' +
      '<div class="divider"></div><b>Riwayat interaksi</b><form class="row wrap mt" data-int><select class="sel sm" style="width:auto" name="kanal">' + ['Telepon', 'WA Manual', 'Email', 'Kunjungan', 'Catatan'].map(x => '<option>' + x + '</option>').join('') + '</select><input class="in sm" style="flex:1;min-width:200px" name="r" maxlength="500" placeholder="Ringkasan, mis. konfirmasi liputan wisuda"><button class="btn btn-primary sm">Catat</button></form><div class="stack s mt" data-tl><div class="skel" style="height:44px"></div></div>'
  });
  m.querySelector('[data-ubah]').onclick = () => { m.close(); formKontak(k); };
  const sl = m.querySelector('[data-salin]'); if (sl) sl.onclick = async () => { try { await navigator.clipboard.writeText(k.NoWA); toast('Nomor disalin', 'ok'); } catch (e) { } };
  const tl = m.querySelector('[data-tl]');
  const gambar = list => { tl.innerHTML = list.length ? list.map(x => '<div class="rem-item">' + ic({ Telepon: 'phone', 'WA Manual': 'message-circle', Email: 'mail', Kunjungan: 'map-pin' }[x.Kanal] || 'notebook-pen') + '<div><b class="small">' + esc(x.Kanal) + '</b> <span class="xs muted">' + fmtTgl(x.Tanggal, { pendek: true, jam: true }) + '</span><div class="small">' + esc(x.Ringkasan) + '</div></div></div>').join('') : '<div class="xs muted">Belum ada interaksi tercatat.</div>'; };
  let data = [];
  const r = await api('crm.detail', { kontakId: id });
  data = r.success ? r.data.interaksi : []; gambar(data);
  const fi = m.querySelector('[data-int]');
  fi.onsubmit = async e => {
    e.preventDefault(); const ring = fi.r.value.trim(); if (!ring) return;
    const baru = { Kanal: fi.kanal.value, Ringkasan: ring, Tanggal: nowStr() }; data = [baru].concat(data); gambar(data); fi.r.value = '';
    const rr = await api('crm.interaksi', { kontakId: id, kanal: baru.Kanal, ringkasan: ring });
    if (!rr.success) { data.shift(); gambar(data); return toast(rr.message, 'err'); }
    setKontakList(kontakList().map(x => (x.KontakID === id ? Object.assign(x, { TerakhirDihubungi: rr.data.terakhir }) : x))); emit();
  };
}
function importKontak() {
  const m = modal({
    judul: 'Import Kontak dari CSV', wide: true,
    isi: '<p class="small muted" style="margin-top:0">Kolom yang dikenali: <span class="code">nama, email, wa, segmen, instansi, tag, catatan</span>. Nomor & email yang sudah ada tidak digandakan (hanya melengkapi kolom kosong).</p><div class="row wrap"><button class="btn btn-ghost sm" data-tpl>' + ic('download', 'sm') + 'Unduh template CSV</button></div><input type="file" accept=".csv,text/csv" class="in mt" style="padding-top:12px" data-file><div class="mt" data-prev></div>',
    kaki: '<button class="btn btn-ghost" data-n>Tutup</button><button class="btn btn-soft" data-scan disabled>Pindai</button><button class="btn btn-primary" data-run disabled>Import</button>'
  });
  let rows = [];
  m.querySelector('[data-tpl]').onclick = () => unduhBlob(new Blob([csvDari([['nama', 'email', 'wa', 'segmen', 'instansi', 'tag', 'catatan'], ['Rina Fotografer', 'rina@kampus.ac.id', '081234567890', 'Tim Liputan', 'BEM', 'fotografer', '']])], { type: 'text/csv' }), 'template-kontak.csv');
  m.querySelector('[data-file]').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const raw = parseCsv(await f.text());
    const low = o => { const x = {}; Object.keys(o).forEach(k => { x[k.toLowerCase().replace(/[^a-z]/g, '')] = o[k]; }); return x; };
    rows = raw.map(low).map(o => ({ nama: o.nama || o.name || '', email: o.email || '', wa: o.wa || o.whatsapp || o.nowa || o.hp || o.telepon || '', segmen: o.segmen || '', instansi: o.instansi || '', tag: o.tag || '', catatan: o.catatan || '' }));
    m.querySelector('[data-prev]').innerHTML = '<div class="info-box">' + ic('file-text') + '<span><b>' + rows.length + ' baris</b> terbaca. Tekan Pindai untuk melihat hasil tanpa menyimpan.</span></div>';
    m.querySelector('[data-scan]').disabled = m.querySelector('[data-run]').disabled = !rows.length;
  };
  const jalan = async (dry, btn) => {
    setBusy(btn, true); const r = await api('crm.import', { rows, dryRun: dry }); setBusy(btn, false);
    if (!r.success) return toast(r.message, 'err');
    m.querySelector('[data-prev]').innerHTML = '<div class="info-box ' + (dry ? '' : 'ok') + '">' + ic(dry ? 'scan-line' : 'circle-check') + '<span>' + esc(r.message) + '</span></div>' + (r.data.galat.length ? '<div class="xs mt" style="color:var(--late)">' + r.data.galat.map(esc).join('<br>') + '</div>' : '');
    if (!dry) { segarkanOwner(true); }
  };
  m.querySelector('[data-n]').onclick = () => m.close();
  m.querySelector('[data-scan]').onclick = e => jalan(true, e.currentTarget);
  m.querySelector('[data-run]').onclick = e => jalan(false, e.currentTarget);
}

/* =====================================================================
   NOTIFIKASI — WhatsApp (Fonnte) & Email ke pemilik
   ===================================================================== */
const CONTOH_VAR = { nama: 'Admin Medsos', tanggal: 'Sabtu, 24 Oktober 2026', jumlahHariIni: 5, jumlahJatuhTempo: 3, jumlahTerlambat: 1, daftarHariIni: '⚠️ Posting Flayer Wisuda (terlambat)\n• 14:00 Revisi Copywriting Reel', hariPenting: '⭐ Terdekat: Wisuda Ke-103 (25 Oktober 2026)', judul: 'Posting Flayer Pendaftaran Wisuda Gel. II', tenggat: 'Sabtu, 24 Oktober 2026 • 10:00 WIB', sisa: '1 jam lagi', kategori: 'Flayer', prioritas: 'Penting', hari: 3, projek: 'Wisuda Sarjana & Magister Ke-103', lokasi: 'Auditorium Utama', selesai: 8, total: 10, persen: 80, sisaTugas: 'Belum selesai:\n☐ Standby liputan prosesi', link: 'https://…/workplan/' };
page('notifikasi', {
  judul: 'Notifikasi', owner: true, statis: true,
  render(el, tab) {
    if (!ownerSiap(el)) return;
    tab = tab || 'konfigurasi';
    const n = S.owner.notif || {}, sis = S.owner.sistem || {};
    const head = '<div class="page-head"><div><div class="kick"><span class="pill blue" style="height:30px">' + ic('bell-ring', 'sm') + 'Pengingat Pribadi</span><span class="pill" style="height:30px">' + (n.waAktif ? '<i class="dot ok"></i>WA aktif' : '<i class="dot warn"></i>WA nonaktif') + '</span><span class="pill" style="height:30px">' + (n.emailAktif ? '<i class="dot ok"></i>Email aktif' : '<i class="dot warn"></i>Email nonaktif') + '</span></div><h1 class="h1">Notifikasi WhatsApp &amp; Email</h1><p class="lead">Pengingat tambahan langsung ke WhatsApp/email Anda (selain notifikasi Google Kalender): ringkasan pagi, H-tenggat, terlambat, hari penting, dan hari-H projek.</p></div></div>' +
      tabsLine(tab, [['konfigurasi', 'Konfigurasi', 'settings'], ['pengingat', 'Matriks Pengingat', 'sliders-horizontal'], ['antrean', 'Antrean & Riwayat', 'inbox']], '#/notifikasi/');
    if (tab === 'pengingat') return renderMatriks(el, head, n);
    if (tab === 'antrean') return renderAntrean(el, head);
    el.innerHTML = head + '<div class="grid g2" style="align-items:start"><section class="card"><div class="card-head"><h2 class="h3 row">' + ic('message-circle') + 'WhatsApp (Fonnte)</h2><button class="switch ' + (n.waSaklar ? 'on' : '') + '" data-sw="wa" aria-label="Aktifkan WhatsApp"></button></div><div class="stack">' +
      '<div class="field"><label>Token Fonnte</label><input class="in" type="password" data-f="token" placeholder="' + esc(n.tokenMask || 'Tempel token dari fonnte.com → Device') + '" autocomplete="off"><div class="hint">Disimpan aman di Script Properties, tidak pernah dikirim ke peramban.' + (n.adaToken ? ' <button type="button" class="link xs" data-hapustoken>Hapus token</button>' : '') + '</div></div>' +
      '<div class="grid g2"><div class="field"><label>Nomor WA pemilik</label><input class="in" data-f="pemilikWa" inputmode="tel" value="' + esc(n.pemilikWa || '') + '" placeholder="0812xxxxxxxx"></div><div class="field"><label>Jeda antarpesan (detik)</label><input class="in" data-f="jeda" value="' + esc(n.jeda || '3') + '"></div></div>' +
      '<div class="row wrap"><button class="btn btn-soft sm" data-cekdev>' + ic('smartphone', 'sm') + 'Cek Perangkat</button><button class="btn btn-ghost sm" data-teswa>' + ic('send', 'sm') + 'Kirim Tes WA</button></div><div class="small" data-dev></div></div></section>' +
      '<section class="card"><div class="card-head"><h2 class="h3 row">' + ic('mail') + 'Email</h2><button class="switch ' + (n.emailSaklar ? 'on' : '') + '" data-sw="email" aria-label="Aktifkan email"></button></div><div class="stack">' +
      '<div class="field"><label>Email pemilik</label><input class="in" type="email" data-f="pemilikEmail" value="' + esc(n.pemilikEmail || '') + '" placeholder="admin@kampus.ac.id"></div><div class="field"><label>Nama pengirim</label><input class="in" data-f="namaPengirim" value="' + esc(n.namaPengirim || 'WORKPLAN') + '"></div>' +
      '<div class="small muted">Sisa kuota email hari ini: <b>' + (sis.kuotaEmail === null || sis.kuotaEmail === undefined ? '—' : sis.kuotaEmail) + '</b> (akun Gmail biasa ±100/hari)</div><div class="row wrap"><button class="btn btn-ghost sm" data-tesemail>' + ic('send', 'sm') + 'Kirim Tes Email</button></div></div></section>' +
      '<section class="card"><h2 class="h3 row">' + ic('alarm-clock') + 'Jadwal Pengingat</h2><div class="grid g2 mt"><div class="field"><label>Jam ringkasan pagi</label><input class="in" type="time" data-f="jamRingkasan" value="' + esc(n.jamRingkasan || '06:30') + '"></div><div class="field"><label>Pengingat sebelum tenggat (menit)</label><input class="in" type="number" min="5" max="1440" data-f="menitSebelum" value="' + esc(n.menitSebelum || '60') + '"></div></div>' +
      '<div class="small muted mt">Hari penting & hari-H projek memakai jadwal H-' + esc((S.set.PENGINGAT_HARI_PENTING || '3,1').split(',').join(' & H-')) + ' pukul ' + esc(S.set.JAM_PENGINGAT || '09:00') + ' (menu Pengaturan).</div></section>' +
      '<section class="card"><h2 class="h3 row">' + ic('zap') + 'Status Sistem</h2><div class="stack s mt small"><div class="row between"><span class="muted">Pekerja latar (tiap 5 menit)</span><b style="color:' + (n.trigger ? '#16A34A' : 'var(--late)') + '">' + (n.trigger ? 'Aktif' : 'Belum aktif') + '</b></div><div class="row between"><span class="muted">Token Fonnte</span><b>' + (n.adaToken ? esc(n.tokenMask) : 'Belum diisi') + '</b></div>' +
      '<div class="info-box small mt">' + ic('info', 'sm') + '<span>Pengingat dikirim lewat antrean (tidak memperlambat aplikasi) dan tidak pernah terkirim dua kali. Data contoh tidak dikirimi pengingat.</span></div></div></section></div>' +
      '<div class="savebar"><span class="draft">' + ic('shield-check', 'sm') + 'Hanya pemilik yang menerima notifikasi</span><button class="btn btn-primary" data-simpan>' + ic('circle-check') + 'Simpan Konfigurasi</button></div>';
    const sw = k => el.querySelector('[data-sw="' + k + '"]');
    el.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => b.classList.toggle('on'));
    const val = k => el.querySelector('[data-f="' + k + '"]').value.trim();
    el.querySelector('[data-simpan]').onclick = async e => {
      const d = { waAktif: sw('wa').classList.contains('on'), emailAktif: sw('email').classList.contains('on'), pemilikWa: val('pemilikWa'), pemilikEmail: val('pemilikEmail'), jeda: val('jeda'), namaPengirim: val('namaPengirim'), jamRingkasan: val('jamRingkasan'), menitSebelum: val('menitSebelum') };
      if (val('token')) d.token = val('token');
      setBusy(e.currentTarget, true, 'Menyimpan…'); const r = await api('notif.configSave', d); setBusy(e.currentTarget, false);
      if (!r.success) return toast('Belum tersimpan', 'err', { sub: r.message });
      S.owner.notif = r.data; setOwnerData(S.owner); toast('Konfigurasi notifikasi tersimpan', 'ok'); route();
    };
    const ht = el.querySelector('[data-hapustoken]'); if (ht) ht.onclick = async () => { if (!(await konfirmasi({ judul: 'Hapus token Fonnte?', teks: 'WhatsApp otomatis nonaktif.', ok: 'Hapus', bahaya: true }))) return; const r = await api('notif.configSave', { token: '__HAPUS__', waAktif: false }); if (r.success) { S.owner.notif = r.data; setOwnerData(S.owner); route(); } else toast(r.message, 'err'); };
    el.querySelector('[data-cekdev]').onclick = async e => { setBusy(e.currentTarget, true, 'Mengecek…'); const r = await api('wa.device', {}); setBusy(e.currentTarget, false); el.querySelector('[data-dev]').innerHTML = r.success ? '<div class="info-box ' + (r.data.status === 'connect' ? 'ok' : 'warn') + '">' + ic('smartphone', 'sm') + '<span>Perangkat <b>' + esc(r.data.device) + '</b> • ' + esc(r.data.status) + ' • paket ' + esc(r.data.paket) + ' • kuota ' + esc(r.data.kuota) + '</span></div>' : '<div class="info-box bad">' + esc(r.message) + '</div>'; };
    el.querySelector('[data-teswa]').onclick = async e => { setBusy(e.currentTarget, true, 'Mengirim…'); const r = await api('wa.test', { nomor: val('pemilikWa') }); setBusy(e.currentTarget, false); toast(r.success ? r.message : 'Tes WA gagal', r.success ? 'ok' : 'err', { sub: r.success ? '' : r.message }); };
    el.querySelector('[data-tesemail]').onclick = async e => { setBusy(e.currentTarget, true, 'Mengirim…'); const r = await api('email.test', { email: val('pemilikEmail') }); setBusy(e.currentTarget, false); toast(r.success ? r.message : 'Tes email gagal', r.success ? 'ok' : 'err', { sub: r.success ? '' : r.message }); };
  }
});
function renderMatriks(el, head, n) {
  const mat = (n.matriks || []).map(x => Object.assign({}, x));
  const prev = s => '<div class="wa-preview">' + esc(String(s).replace(/\{(\w+)\}/g, (m, k) => (CONTOH_VAR[k] !== undefined ? CONTOH_VAR[k] : m))).replace(/\*([^*\n]+)\*/g, '<b>$1</b>') + '</div>';
  el.innerHTML = head + (!n.waSaklar && !n.emailSaklar ? '<div class="info-box warn mb">' + ic('triangle-alert') + '<span>Saklar utama WhatsApp & Email masih mati — aktifkan di tab Konfigurasi.</span></div>' : '') +
    '<section class="card" style="padding:0;overflow:hidden"><div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Pengingat</th><th style="width:90px">WhatsApp</th><th style="width:90px">Email</th><th style="width:90px"></th></tr></thead><tbody>' +
    mat.map((m, i) => '<tr><td><b>' + esc(m.label) + '</b><div class="xs muted">' + esc(m.kode) + '</div></td><td><button class="switch ' + (m.wa ? 'on' : '') + '" data-mw="' + i + '" ' + (n.waSaklar ? '' : 'disabled') + ' aria-label="WA"></button></td><td><button class="switch ' + (m.email ? 'on' : '') + '" data-me="' + i + '" ' + (n.emailSaklar ? '' : 'disabled') + ' aria-label="Email"></button></td><td><button class="btn btn-ghost sm" data-ed="' + i + '">' + ic('pencil', 'sm') + 'Ubah</button></td></tr>' +
      '<tr data-row="' + i + '" hidden><td colspan="4" style="background:var(--surface-2)"><div class="grid g2"><div class="stack s"><div class="field"><label>Subjek email</label><input class="in sm" data-sj="' + i + '" value="' + esc(m.subjek) + '"></div><div class="field"><label>Isi pesan</label><textarea class="ta" rows="7" data-ps="' + i + '">' + esc(m.pesan) + '</textarea></div>' +
      '<div class="row wrap" style="gap:6px">' + (m.vars || []).map(v => '<button type="button" class="chip c-biru" data-ins="' + i + '" data-v="{' + v + '}">{' + v + '}</button>').join('') + '</div><button type="button" class="link xs" data-reset="' + i + '">↺ Kembalikan bawaan</button></div><div><div class="lbl mb">Pratinjau WhatsApp</div><div data-pv="' + i + '">' + prev(m.pesan) + '</div></div></div></td></tr>').join('') +
    '</tbody></table></div></section><div class="savebar"><span class="draft">' + ic('info', 'sm') + 'Gunakan *teks* untuk tebal di WhatsApp</span><button class="btn btn-primary" data-simpan>' + ic('circle-check') + 'Simpan Matriks</button></div>';
  el.querySelectorAll('[data-mw]').forEach(b => b.onclick = () => { b.classList.toggle('on'); mat[+b.dataset.mw].wa = b.classList.contains('on'); });
  el.querySelectorAll('[data-me]').forEach(b => b.onclick = () => { b.classList.toggle('on'); mat[+b.dataset.me].email = b.classList.contains('on'); });
  el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => { const r = el.querySelector('[data-row="' + b.dataset.ed + '"]'); r.hidden = !r.hidden; });
  el.querySelectorAll('[data-ps]').forEach(t => t.oninput = () => { mat[+t.dataset.ps].pesan = t.value; el.querySelector('[data-pv="' + t.dataset.ps + '"]').innerHTML = prev(t.value); });
  el.querySelectorAll('[data-sj]').forEach(t => t.oninput = () => { mat[+t.dataset.sj].subjek = t.value; });
  el.querySelectorAll('[data-ins]').forEach(b => b.onclick = () => { const t = el.querySelector('[data-ps="' + b.dataset.ins + '"]'); const p = t.selectionStart || t.value.length; t.value = t.value.slice(0, p) + b.dataset.v + t.value.slice(p); t.dispatchEvent(new Event('input')); t.focus(); });
  el.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => { const i = +b.dataset.reset, t = el.querySelector('[data-ps="' + i + '"]'); t.value = mat[i].pesanDefault; el.querySelector('[data-sj="' + i + '"]').value = mat[i].subjekDefault; mat[i].subjek = mat[i].subjekDefault; t.dispatchEvent(new Event('input')); });
  el.querySelector('[data-simpan]').onclick = async e => {
    const matriks = {}; mat.forEach(m => { matriks[m.kode] = { wa: m.wa, email: m.email, pesan: m.pesan, subjek: m.subjek }; });
    setBusy(e.currentTarget, true, 'Menyimpan…'); const r = await api('notif.configSave', { matriks }); setBusy(e.currentTarget, false);
    if (!r.success) return toast(r.message, 'err'); S.owner.notif = r.data; setOwnerData(S.owner); toast('Matriks pengingat tersimpan', 'ok');
  };
}
async function renderAntrean(el, head) {
  const f = S.ui.nq = Object.assign({ status: '', kanal: '' }, S.ui.nq || {});
  const c = Store.get('nq', null);
  const gambar = d => {
    const ring = d.ringkas || {};
    el.innerHTML = head + '<div class="grid g4">' + [['Menunggu', ring.Antri, 'hourglass', 'c-oranye', 'Antri'], ['Terkirim', ring.Terkirim, 'circle-check', 'c-hijau', 'Terkirim'], ['Gagal', ring.Gagal, 'circle-alert', 'c-pink', 'Gagal'], ['Dibatalkan', ring.Batal, 'x', 'c-abu', 'Batal']].map(([l, v, i, w, s]) => '<button class="card kpi hov" data-fs="' + s + '"><div class="k-top"><span class="k-lbl">' + l + '</span><span class="k-ic ' + w + '">' + ic(i) + '</span></div><div class="k-val">' + (v || 0) + '</div></button>').join('') + '</div>' +
      '<div class="row wrap mt-l"><select class="sel sm" style="width:auto" data-st><option value="">Semua status</option>' + ['Antri', 'Terkirim', 'Gagal', 'Batal'].map(s => '<option ' + (f.status === s ? 'selected' : '') + '>' + s + '</option>').join('') + '</select><select class="sel sm" style="width:auto" data-kn><option value="">Semua kanal</option><option ' + (f.kanal === 'WA' ? 'selected' : '') + '>WA</option><option ' + (f.kanal === 'EMAIL' ? 'selected' : '') + '>EMAIL</option></select><span style="flex:1"></span><button class="btn btn-soft sm" data-proses>' + ic('send', 'sm') + 'Proses Sekarang</button><button class="btn btn-ghost sm" data-ulang>' + ic('rotate-ccw', 'sm') + 'Ulangi yang Gagal</button></div>' +
      '<section class="card mt" style="padding:0;overflow:hidden">' + ((d.rows || []).length ? '<div class="tbl-wrap" style="border:0"><table class="tbl resp"><thead><tr><th>Waktu</th><th>Kanal</th><th>Event</th><th>Pesan</th><th>Status</th></tr></thead><tbody>' +
        d.rows.map(r => '<tr><td class="small">' + fmtTgl(r.DibuatPada, { pendek: true, jam: true }) + '</td><td><span class="badge ' + (r.Kanal === 'WA' ? 'b-ok' : 'b-run') + '">' + esc(r.Kanal) + '</span></td><td class="xs">' + esc(r.Event) + '</td><td class="small"><div class="clamp2" style="max-width:420px">' + esc(String(r.Pesan).replace(/\*/g, '')) + '</div></td><td><span class="badge ' + ({ Terkirim: 'b-ok', Gagal: 'b-late', Antri: 'b-warn', Batal: 'b-idle' }[r.Status] || 'b-idle') + '">' + esc(r.Status) + '</span>' + (r.Respon ? '<div class="xs muted">' + esc(r.Respon) + '</div>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<div style="padding:24px">' + kosong('inbox', 'Antrean kosong', 'Pengingat yang terjadwal akan muncul di sini.') + '</div>') + '</section>';
    el.querySelectorAll('[data-fs]').forEach(b => b.onclick = () => { f.status = f.status === b.dataset.fs ? '' : b.dataset.fs; muat(); });
    el.querySelector('[data-st]').onchange = e => { f.status = e.target.value; muat(); };
    el.querySelector('[data-kn]').onchange = e => { f.kanal = e.target.value; muat(); };
    el.querySelector('[data-proses]').onclick = async e => { setBusy(e.currentTarget, true, 'Memproses…'); const r = await api('notif.processNow', {}); setBusy(e.currentTarget, false); toast(r.success ? r.message : 'Gagal', r.success ? 'ok' : 'err', { sub: r.success ? '' : r.message }); muat(); };
    el.querySelector('[data-ulang]').onclick = async e => { setBusy(e.currentTarget, true); const r = await api('notif.retry', {}); setBusy(e.currentTarget, false); toast(r.message, r.success ? 'ok' : 'err'); muat(); };
  };
  const muat = async () => { const r = await api('notif.queue', f); if (r.success) { Store.set('nq', r.data); if (S.route.name === 'notifikasi' && S.route.args[0] === 'antrean') gambar(r.data); } else toast(r.message, 'err'); };
  gambar(c || { rows: [], ringkas: {} });
  muat();
}

/* =====================================================================
   MIGRASI DATA — import spreadsheet lama, CSV, cadangan
   ===================================================================== */
page('migrasi', {
  judul: 'Migrasi Data', owner: true, statis: true,
  render(el) {
    const sh = [['Projek', 'Projek/Event'], ['TugasProjek', 'Tugas Projek'], ['Catatan', 'Catatan'], ['CRM_Kontak', 'Kontak CRM'], ['CRM_Interaksi', 'Interaksi CRM'], ['Pengaturan', 'Pengaturan']];
    el.innerHTML = '<div class="page-head"><div><div class="kick"><span class="pill blue" style="height:30px">' + ic('database', 'sm') + 'Migrasi Database</span></div><h1 class="h1">Migrasi &amp; Cadangan Data</h1><p class="lead">Pindahkan data dari spreadsheet WORKPLAN versi lama atau CSV. Sumber hanya dibaca, aman diulang (tanpa data dobel), dan selalu bisa dipindai dulu.</p></div></div>' +
      '<div class="grid g2" style="align-items:start"><div class="stack l" style="gap:var(--gut)"><section class="card"><h2 class="h3 row">' + ic('file-spreadsheet') + 'Import dari Spreadsheet Lama</h2><div class="stack mt"><div class="field"><label>URL atau ID spreadsheet sumber</label><input class="in" data-src placeholder="https://docs.google.com/spreadsheets/d/…"><div class="hint">' + ic('lock', 'sm') + ' Hanya dibaca — app lama tidak diubah. Harus bisa diakses akun pemilik app ini.</div></div>' +
      '<div class="lbl">Data yang diimpor</div><div class="grid g2" style="gap:8px">' + sh.map(([k, l]) => '<label class="cbx" style="padding:10px"><input type="checkbox" data-sh="' + k + '" checked><div><b>' + l + '</b></div></label>').join('') + '</div>' +
      '<label class="cbx"><input type="checkbox" data-ow><div><b>Timpa data yang sudah ada</b><small>Bawaan mati — data yang sudah diubah di app baru tidak ditimpa.</small></div></label>' +
      '<label class="cbx"><input type="checkbox" data-sk><div><b>Sinkron ulang semua ke Google Kalender</b><small>Centang bila sumber dari akun Google lain (ID event lama tidak berlaku).</small></div></label>' +
      '<div class="row wrap"><button class="btn btn-soft" data-scan>' + ic('scan-line') + 'Pindai (Dry-run)</button><button class="btn btn-primary" data-run>' + ic('upload') + 'Jalankan Import</button></div><div data-hasil></div></div></section>' +
      '<section class="card"><h2 class="h3 row">' + ic('file-text') + 'Import Catatan dari CSV</h2><p class="small muted">Kolom: <span class="code">Judul, Kategori, Tenggat, TanggalHariPenting, Prioritas, Status, CatatanTambahan, Projek</span>. Tenggat boleh <span class="code">2026-10-24 10:00</span> atau <span class="code">24/10/2026 10:00</span>. Judul+tenggat yang sama dilewati.</p>' +
      '<div class="row wrap"><button class="btn btn-ghost sm" data-tplcsv>' + ic('download', 'sm') + 'Template CSV</button></div><input type="file" accept=".csv,text/csv" class="in mt" style="padding-top:12px" data-csv><div class="row wrap mt"><button class="btn btn-soft" data-cscan disabled>Pindai CSV</button><button class="btn btn-primary" data-crun disabled>Import CSV</button></div><div data-chasil class="mt"></div></section></div>' +
      '<div class="stack l" style="gap:var(--gut)"><section class="card"><h2 class="h3 row">' + ic('shield-check') + 'Cadangan</h2><p class="small muted">Unduh salinan seluruh data yang ada di perangkat ini (catatan, projek, tugas, kontak) sebagai JSON atau CSV.</p><div class="row wrap"><button class="btn btn-soft" data-bjson>' + ic('download') + 'Cadangan JSON</button><button class="btn btn-ghost" data-bcsv>' + ic('file-spreadsheet') + 'Semua Catatan (CSV)</button></div></section>' +
      '<section class="card"><h2 class="h3 row">' + ic('list-checks') + 'Checklist Pindah ke Versi Baru</h2><ol class="small" style="padding-left:20px;line-height:1.9;margin:10px 0 0"><li>Pasang WORKPLAN baru di akun Google <b>yang sama</b> (ID event kalender tetap berlaku).</li><li>Masuk Mode Pemilik → <b>Pindai</b> → periksa angka &amp; peringatan.</li><li><b>Jalankan Import</b>, cek Beranda, Catatan, Projek, Kontak.</li><li>Tepat sebelum pindah: <b>jalankan import sekali lagi</b> (delta) untuk data terbaru.</li><li>Bagikan link baru ke atasan; arsipkan deployment lama.</li></ol><div class="info-box warn mt small">' + ic('info', 'sm') + '<span>Sesi login & PIN tidak ikut pindah — masuk ulang dengan PIN app baru. Token Fonnte diisi ulang di menu Notifikasi.</span></div></section></div></div>';
    const hasil = el.querySelector('[data-hasil]');
    const jalan = async (dry, btn) => {
      const source = el.querySelector('[data-src]').value.trim(); if (!source) return toast('Tempel URL/ID spreadsheet sumber', 'warn');
      const sheets = [...el.querySelectorAll('[data-sh]:checked')].map(x => x.dataset.sh); if (!sheets.length) return toast('Pilih minimal satu data', 'warn');
      if (!dry && !(await konfirmasi({ judul: 'Jalankan import?', teks: 'Data dari sumber akan ditambahkan ke WORKPLAN ini. Aman diulang — data yang sama tidak digandakan.', ok: 'Jalankan Import' }))) return;
      setBusy(btn, true, dry ? 'Memindai…' : 'Mengimpor…');
      const r = await api(dry ? 'mig.scan' : 'mig.run', { source, sheets, overwrite: el.querySelector('[data-ow]').checked, sinkronUlang: el.querySelector('[data-sk]').checked }, { timeout: 300000, tries: 1 });
      setBusy(btn, false);
      if (!r.success) { hasil.innerHTML = '<div class="info-box bad mt">' + ic('circle-alert') + '<span>' + esc(r.message) + '</span></div>'; return; }
      const d = r.data;
      hasil.innerHTML = '<div class="info-box ' + (dry ? '' : 'ok') + ' mt">' + ic(dry ? 'scan-line' : 'circle-check') + '<span><b>' + esc(d.source.name) + '</b> — ' + esc(r.message) + '</span></div>' +
        '<div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>Data</th><th>Di sumber</th><th>Ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' + Object.keys(d.report).map(k => { const x = d.report[k]; return '<tr><td><b>' + esc(k) + '</b>' + (x.catatan ? '<div class="xs muted">' + esc(x.catatan) + '</div>' : '') + '</td><td>' + x.source + '</td><td style="color:#16A34A;font-weight:700">' + x.inserted + '</td><td style="color:var(--primary);font-weight:700">' + x.updated + '</td><td class="muted">' + x.skipped + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        (d.warnings.length ? '<div class="info-box warn mt small">' + ic('triangle-alert', 'sm') + '<div>' + d.warnings.map(esc).join('<br>') + '</div></div>' : '');
      if (!dry) { await revalidate(true); segarkanOwner(true); toast('Import selesai', 'ok'); }
    };
    el.querySelector('[data-scan]').onclick = e => jalan(true, e.currentTarget);
    el.querySelector('[data-run]').onclick = e => jalan(false, e.currentTarget);
    let rows = [];
    el.querySelector('[data-tplcsv]').onclick = () => unduhBlob(new Blob([csvDari([['Judul', 'Kategori', 'Tenggat', 'TanggalHariPenting', 'Prioritas', 'Status', 'CatatanTambahan', 'Projek'], ['Flayer Pendaftaran Wisuda', 'Flayer', '2026-10-24 10:00', '2026-10-25', 'Penting', 'Belum', 'Ukuran feed 1080x1080', 'Wisuda Sarjana & Magister Ke-103']])], { type: 'text/csv' }), 'template-catatan.csv');
    el.querySelector('[data-csv]').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      rows = parseCsv(await f.text());
      el.querySelector('[data-chasil]').innerHTML = '<div class="info-box">' + ic('file-text') + '<span><b>' + rows.length + ' baris</b> terbaca dari ' + esc(f.name) + '.</span></div>';
      el.querySelector('[data-cscan]').disabled = el.querySelector('[data-crun]').disabled = !rows.length;
    };
    const csv = async (dry, btn) => {
      setBusy(btn, true); const r = await api('mig.csv', { rows, dryRun: dry }, { timeout: 120000, tries: 1 }); setBusy(btn, false);
      el.querySelector('[data-chasil]').innerHTML = '<div class="info-box ' + (r.success ? (dry ? '' : 'ok') : 'bad') + '">' + ic(r.success ? 'circle-check' : 'circle-alert') + '<span>' + esc(r.message) + '</span></div>' + (r.success && r.data.galat.length ? '<div class="xs mt" style="color:var(--late)">' + r.data.galat.map(esc).join('<br>') + '</div>' : '');
      if (r.success && !dry) { await revalidate(true); toast('CSV diimpor', 'ok'); }
    };
    el.querySelector('[data-cscan]').onclick = e => csv(true, e.currentTarget);
    el.querySelector('[data-crun]').onclick = e => csv(false, e.currentTarget);
    el.querySelector('[data-bjson]').onclick = () => { const data = { app: 'WORKPLAN', dibuat: nowStr(), pengaturan: S.set, catatan: semuaCatatan(), projek: [...S.prj.values()], tugas: [...S.tgs.values()], kontak: kontakList() }; unduhBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'Workplan-Cadangan-' + today() + '.json'); };
    el.querySelector('[data-bcsv]').onclick = () => { const rows2 = [COLS.ctn].concat(semuaCatatan().map(c => COLS.ctn.map(k => c[k]))); unduhBlob(new Blob([csvDari(rows2)], { type: 'text/csv' }), 'Workplan-Semua-Catatan-' + today() + '.csv'); };
  }
});
