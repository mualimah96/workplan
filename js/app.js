/* =====================================================================
   WORKPLAN — app.js
   Kerangka tampilan (sidebar, topbar, appbar HP, navigasi bawah, FAB),
   indikator sinkron, pencarian global, dan urutan start aplikasi.
   ===================================================================== */
'use strict';

const NAV = [
  ['beranda', 'Beranda', 'house'], ['catatan', 'Catatan Harian', 'circle-check'], ['projek', 'Projek / Event', 'folder-open'],
  ['kalender', 'Kalender Bulanan', 'calendar-days'], ['laporan', 'Laporan & Rekap', 'chart-column']
];
const NAV_OWNER = [['dokumen', 'Dokumen', 'file-badge'], ['kontak', 'Kontak', 'users'], ['notifikasi', 'Notifikasi WA', 'bell-ring'], ['migrasi', 'Migrasi Data', 'database']];
const NAV_BAWAH = [['beranda', 'Beranda', 'house'], ['catatan', 'Catatan', 'notebook-pen'], ['projek', 'Projek', 'folder-open'], ['kalender', 'Kalender', 'calendar-days'], ['laporan', 'Laporan', 'chart-column']];
let _installEvt = null;

function jumlahTelat() { const now = nowStr(); let n = 0; S.ctn.forEach(c => { if (isTelat(c, now)) n++; }); return n; }
function navAktif() { const n = S.route.name; return n === 'catatanForm' ? 'catatan' : n; }

function renderChrome() {
  const owner = isOwner(), aktif = navAktif(), telat = S.booted ? jumlahTelat() : 0, nama = S.set.NAMA_ADMIN || 'Admin Medsos';
  const sb = $('#sidebar');
  const navHtml = NAV.map(([k, l, i]) => '<a href="#/' + k + '" class="' + (aktif === k ? 'on' : '') + '">' + ic(i) + l + (k === 'catatan' && telat ? '<span class="cnt" title="Terlambat">' + telat + '</span>' : '') + '</a>').join('') +
    (owner ? '<div class="nav-sep">Modul Pemilik</div>' + NAV_OWNER.map(([k, l, i]) => '<a href="#/' + k + '" class="' + (aktif === k ? 'on' : '') + '">' + ic(i) + l + '</a>').join('') : '') +
    '<a href="#/pengaturan" class="' + (aktif === 'pengaturan' ? 'on' : '') + '">' + ic('settings') + 'Pengaturan<span class="tag">Pemilik</span></a>';
  const sbHtml = '<a class="brand" href="#/beranda"><span class="brand-logo">' + ic('check') + '</span><span><b>Workplan</b><small>' + esc((window.WP_CONFIG && WP_CONFIG.TAGLINE) || 'Kampus Planner') + '</small></span></a><nav class="nav stack s" style="gap:4px">' + navHtml + '</nav>' +
    '<div class="side-user"><div class="who"><span class="avatar">' + esc(inisial(nama)) + '</span><div style="min-width:0"><b class="trunc">' + esc(nama) + '</b><small><i class="dot ' + (owner ? '' : 'warn') + '"></i>' + (owner ? 'Mode Pemilik' : 'Mode Lihat Saja') + '</small></div></div>' +
    '<div class="gc"><span class="row" style="gap:5px">' + ic('refresh-cw', 'sm') + 'Google Calendar</span><span class="badge ' + (S.set.KALENDER_AKTIF === 'TIDAK' ? 'b-idle' : 'b-run') + '" style="height:22px;font-size:12px">' + (S.set.KALENDER_AKTIF === 'TIDAK' ? 'Nonaktif' : 'Tersinkron') + '</span></div>' +
    (owner ? '<button class="btn btn-ghost sm" data-act="keluar">' + ic('log-out', 'sm') + 'Keluar</button>' : '<button class="btn btn-soft sm" data-act="login">' + ic('lock', 'sm') + 'Masuk Pemilik</button>') + '</div>';
  if (sb._h !== sbHtml) { sb.innerHTML = sbHtml; sb._h = sbHtml; }

  const tb = $('#topbar');
  if (!tb._built) {
    tb._built = 1;
    tb.innerHTML = '<div class="search"><span>' + ic('search') + '</span><input id="cari" placeholder="Cari catatan, tugas, projek…  ( / )" autocomplete="off" aria-label="Pencarian global"><div class="search-pop" id="cari-pop" hidden></div></div>' +
      '<span class="pill blue" id="tb-date"></span><span id="tb-sync"></span><span id="tb-mode"></span><span class="top-sp"></span><span id="tb-auth"></span><button class="avatar" id="tb-av" aria-label="Menu akun"></button>';
    pasangCari($('#cari'), $('#cari-pop'));
    $('#tb-av').onclick = e => menuAkun(e.currentTarget);
    addEventListener('scroll', () => tb.classList.toggle('scrolled', scrollY > 4), { passive: true });
  }
  $('#tb-date').innerHTML = ic('calendar', 'sm') + fmtTgl(today(), { hari: true });
  $('#tb-mode').innerHTML = owner ? '<span class="pill lav">' + ic('lock', 'sm') + 'Mode Pemilik</span>' : '<button class="pill" data-act="login">' + ic('eye', 'sm') + 'Mode Lihat</button>';
  $('#tb-auth').innerHTML = owner ? '<button class="top-btn" data-act="keluar">' + ic('lock-open', 'sm') + 'Keluar</button>' : '<button class="top-btn" data-act="login">' + ic('log-in', 'sm') + 'Masuk Pemilik</button>';
  $('#tb-av').textContent = inisial(nama);

  const ab = $('#appbar');
  const abHtml = '<div class="ab-brand"><b>WORKPLAN <i class="dot"></i></b><small>' + fmtTgl(today(), { hari: true }) + '</small></div><span id="ab-sync"></span>' +
    (owner ? '<span class="pill lav"><i class="dot"></i><span class="lbl-m">Mode </span>Pemilik</span>' : '<button class="pill" data-act="login">' + ic('lock', 'sm') + '<span class="lbl-m">Masuk</span></button>') +
    '<button class="avatar" id="ab-av" aria-label="Menu">' + esc(inisial(nama)) + '</button>';
  if (ab._h !== abHtml) { ab.innerHTML = abHtml; ab._h = abHtml; $('#ab-av').onclick = e => menuAkun(e.currentTarget, true); }

  const bn = $('#bottomnav');
  const bnHtml = NAV_BAWAH.map(([k, l, i]) => '<a href="#/' + k + '" class="' + (aktif === k ? 'on' : '') + '">' + ic(i) + l + (k === 'catatan' && telat ? '<span class="cnt">' + telat + '</span>' : '') + '</a>').join('');
  if (bn._h !== bnHtml) { bn.innerHTML = bnHtml; bn._h = bnHtml; }

  const fab = $('#fab');
  const formMode = S.route.name === 'catatan' && (S.route.args[0] === 'baru' || S.route.args[0] === 'ubah');
  fab.hidden = !owner || formMode || ['pengaturan', 'notifikasi', 'migrasi', 'dokumen', 'v'].indexOf(S.route.name) > -1;
  if (!fab._b) { fab._b = 1; fab.innerHTML = ic('plus'); fab.onclick = () => (S.route.name === 'projek' && !S.route.args[0] ? formProjek() : S.route.name === 'kontak' ? formKontak() : go('#/catatan/baru' + (S.route.name === 'kalender' && S.ui.kal ? '/' + S.ui.kal.sel : ''))); }
  renderSync();
}

function renderSync() {
  const owner = isOwner(), n = Outbox.q.length;
  let html;
  if (Outbox.busy) html = '<span class="pill blue">' + ic('loader-circle', 'sm spin') + 'Menyimpan ' + n + '…</span>';
  else if (n && navigator.onLine === false) html = '<span class="pill warn">' + ic('wifi-off', 'sm') + 'Offline • ' + n + ' menunggu</span>';
  else if (n && !owner) html = '<button class="pill warn" data-act="login">' + ic('lock', 'sm') + n + ' perubahan perlu login</button>';
  else if (n) html = '<button class="pill warn" data-act="flush">' + ic('refresh-cw', 'sm') + n + ' menunggu sinkron</button>';
  else if (navigator.onLine === false) html = '<span class="pill warn">' + ic('wifi-off', 'sm') + 'Offline — data tersimpan di perangkat</span>';
  else if (S.set.KALENDER_AKTIF === 'TIDAK') html = '<span class="pill">' + ic('calendar', 'sm') + 'Kalender nonaktif</span>';
  else if (owner && S.kal.tertunda > 0) html = '<button class="pill warn" data-act="sinkronUlang">' + ic('refresh-cw', 'sm') + S.kal.tertunda + ' belum tersinkron</button>';
  else html = '<span class="pill blue"><i class="dot ok pulse"></i>Google Calendar Aktif</span>';
  const t = $('#tb-sync'); if (t && t._h !== html) { t.innerHTML = html; t._h = html; }
  const a = $('#ab-sync'), off = navigator.onLine === false, mini = n + '|' + off + '|' + Outbox.busy;
  if (a && a._h !== mini) { a.innerHTML = n || off ? '<span class="pill warn" style="padding:0 10px">' + ic(off ? 'wifi-off' : 'refresh-cw', 'sm' + (Outbox.busy ? ' spin' : '')) + (n || '') + '</span>' : ''; a._h = mini; }
}
Aksi.flush = () => Outbox.flush();
Aksi.keluar = () => keluar();

function menuAkun(anchor, mobile) {
  const owner = isOwner();
  menuPop(anchor, [
    mobile ? { label: 'Cari catatan & projek', ikon: 'search', fn: cariMobile } : null,
    owner ? null : { label: 'Masuk sebagai Pemilik', ikon: 'log-in', fn: () => openLogin() },
    owner ? { label: 'Dokumen Resmi', ikon: 'file-badge', fn: () => go('#/dokumen') } : null,
    owner ? { label: 'Kontak (CRM)', ikon: 'users', fn: () => go('#/kontak') } : null,
    owner ? { label: 'Notifikasi WA & Email', ikon: 'bell-ring', fn: () => go('#/notifikasi') } : null,
    owner ? { label: 'Migrasi & Cadangan', ikon: 'database', fn: () => go('#/migrasi') } : null,
    { label: 'Pengaturan', ikon: 'settings', fn: () => go('#/pengaturan') },
    { label: owner ? 'Sinkron Ulang Kalender' : 'Muat Ulang Data', ikon: 'refresh-cw', fn: () => Aksi.sinkronUlang(anchor) },
    { label: 'Cek Keaslian Dokumen', ikon: 'shield-check', fn: () => go('#/v') },
    _installEvt ? { label: 'Pasang di Layar Utama', ikon: 'smartphone', fn: async () => { _installEvt.prompt(); _installEvt = null; } } : null,
    owner ? { label: 'Keluar dari Mode Pemilik', ikon: 'log-out', bahaya: true, fn: keluar } : null
  ]);
}

/* ---------------- Pencarian global ---------------- */
function hasilCari(q) {
  q = q.toLowerCase().trim(); if (q.length < 2) return [];
  const out = [];
  S.ctn.forEach(c => { if ((c.Judul + ' ' + c.CatatanTambahan + ' ' + c.ID).toLowerCase().indexOf(q) > -1) out.push({ ikon: 'notebook-pen', judul: c.Judul, sub: c.Kategori + ' • ' + fmtTgl(c.Tenggat, { pendek: true, jam: true }) + ' • ' + c.Status, fn: () => (isOwner() ? go('#/catatan/ubah/' + c.ID) : lihatCatatan(c.ID)), t: c.Tenggat }); });
  S.prj.forEach(p => { if ((p.NamaProjek + ' ' + p.Lokasi + ' ' + p.Deskripsi).toLowerCase().indexOf(q) > -1) out.push({ ikon: 'folder-open', judul: p.NamaProjek, sub: 'Projek • Hari-H ' + fmtTgl(p.TanggalAcara, { pendek: true }), fn: () => go('#/projek/' + p.ProjekID), t: '~' }); });
  S.tgs.forEach(t => { if (t.NamaTugas.toLowerCase().indexOf(q) > -1) { const p = S.prj.get(t.ProjekID); out.push({ ikon: 'list-checks', judul: t.NamaTugas, sub: 'Tugas projek • ' + (p ? p.NamaProjek : ''), fn: () => go('#/projek/' + t.ProjekID), t: t.Tenggat }); } });
  if (isOwner()) kontakList().forEach(k => { if ((k.Nama + ' ' + k.NoWA + ' ' + k.Email).toLowerCase().indexOf(q) > -1) out.push({ ikon: 'user', judul: k.Nama, sub: 'Kontak • ' + (k.Segmen || ''), fn: () => { go('#/kontak'); setTimeout(() => detailKontak(k.KontakID), 50); }, t: '~' }); });
  return out.sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, 10);
}
function pasangCari(inp, pop) {
  let hasil = [], idx = 0;
  const gambar = () => {
    if (!inp.value.trim()) { pop.hidden = true; return; }
    hasil = hasilCari(inp.value); idx = 0;
    pop.innerHTML = hasil.length ? hasil.map((h, i) => '<button data-i="' + i + '" class="' + (i === idx ? 'on' : '') + '">' + ic(h.ikon) + '<span style="min-width:0"><b class="trunc" style="display:block">' + esc(h.judul) + '</b><small>' + esc(h.sub) + '</small></span></button>').join('') : '<div class="small muted" style="padding:12px">Tidak ditemukan untuk "' + esc(inp.value) + '"</div>';
    pop.hidden = false;
  };
  inp.addEventListener('input', debounce(gambar, 120));
  inp.addEventListener('focus', gambar);
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = clamp(idx + (e.key === 'ArrowDown' ? 1 : -1), 0, hasil.length - 1); pop.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === idx)); }
    else if (e.key === 'Enter' && hasil[idx]) { hasil[idx].fn(); inp.value = ''; pop.hidden = true; inp.blur(); }
    else if (e.key === 'Escape') { inp.value = ''; pop.hidden = true; inp.blur(); }
  });
  pop.addEventListener('mousedown', e => { const b = e.target.closest('button'); if (!b) return; e.preventDefault(); hasil[+b.dataset.i].fn(); inp.value = ''; pop.hidden = true; inp.blur(); });
  inp.addEventListener('blur', () => setTimeout(() => { pop.hidden = true; }, 120));
}
function cariMobile() {
  const m = modal({ judul: 'Cari', isi: '<div class="search" style="max-width:none"><span>' + ic('search') + '</span><input id="cari-m" placeholder="Cari catatan, tugas, projek…" autocomplete="off" autofocus><div class="search-pop" id="cari-m-pop" hidden style="position:static;box-shadow:none;margin-top:8px"></div></div>' });
  pasangCari(m.querySelector('#cari-m'), m.querySelector('#cari-m-pop'));
  m.querySelector('#cari-m-pop').addEventListener('mousedown', () => setTimeout(() => m.close(), 10));
}
document.addEventListener('keydown', e => {
  if ((e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
    const c = $('#cari'); if (c && c.offsetParent) { e.preventDefault(); c.focus(); } else if (e.key !== '/') { e.preventDefault(); cariMobile(); }
  }
});

/* ---------------- Splash & kegagalan awal ---------------- */
function tutupSplash() { const s = $('#splash'); if (s && !s.classList.contains('hide')) { s.classList.add('hide'); setTimeout(() => s.remove(), 250); } }
function tampilGagalBoot(pesan) {
  const s = $('#splash'); if (!s) return;
  s.innerHTML = '<div class="card" style="max-width:440px;text-align:center;margin:16px"><div class="empty">' + ic('wifi-off') + '<b>Belum bisa terhubung ke server</b><div class="small">' + esc(pesan || 'Periksa koneksi internet Anda.') + '</div></div><button class="btn btn-primary" onclick="location.reload()">' + ic('refresh-cw') + 'Coba lagi</button></div>';
}
function tampilBelumKonfig() {
  const s = $('#splash'); if (!s) return;
  s.innerHTML = '<div class="card" style="max-width:560px;margin:16px"><div class="row" style="gap:12px"><span class="brand-logo" style="margin:0;animation:none">' + ic('check') + '</span><div><b style="font-size:20px">WORKPLAN hampir siap</b><div class="small muted">Satu langkah lagi: sambungkan ke backend Google Apps Script.</div></div></div>' +
    '<ol class="small" style="line-height:1.9;padding-left:20px"><li>Deploy <b>Kode.gs</b> dkk. sebagai Web App (Execute as: <b>Me</b>, Who has access: <b>Anyone</b>).</li><li>Salin URL yang berakhiran <span class="code">/exec</span>.</li><li>Buka <span class="code">js/config.js</span>, isi <span class="code">GAS_URL</span>, lalu push ulang ke GitHub.</li></ol>' +
    (gasGanda() ? '<div class="info-box bad small mb">' + ic('triangle-alert', 'sm') + '<span><b>URL tertempel dua kali.</b> Isi GAS_URL cukup satu kali, persis seperti yang disalin dari Kelola deployment.</span></div>' : '') +
    '<div class="info-box small">' + ic('info', 'sm') + '<span>URL sekarang: <span class="code">' + esc(gasUrl() || '(kosong)') + '</span></span></div></div>';
}

/* ---------------- Start aplikasi ---------------- */
function init() {
  const auth = Store.get('auth', null);
  if (auth && auth.exp > Date.now()) { S.token = auth.token; S.exp = auth.exp; }
  const ow = Store.get('owner', null);
  if (ow && isOwner()) S.owner = ow.d;
  renderChrome();
  if (!gasSiap()) { tampilBelumKonfig(); return; }
  warmUpServer();
  const c = Store.get('boot', null);
  if (c && c.d && c.d.ver) { hydrate(c.d); S.booted = true; tutupSplash(); route(); }          // 0 ms: tampil dari cache perangkat
  else setTimeout(() => { const m = $('#splash-msg'); if (m && !S.booted) m.textContent = 'Server sedang bangun… (koneksi pertama bisa 3–8 detik)'; }, 3500);
  revalidate();                                                                                  // segarkan di latar
  if (isOwner()) segarkanOwner();
  if (Outbox.q.length) Outbox.jadwal(1200);
  let tersembunyi = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { tersembunyi = Date.now(); return; }
    if (Date.now() - tersembunyi > 120000) { warmUpServer(); revalidate(); if (isOwner()) segarkanOwner(); }
    Outbox.flush(); emit();
  });
  addEventListener('online', () => { renderSync(); Outbox.flush(); revalidate(); });
  addEventListener('offline', renderSync);
  setInterval(() => { if (document.visibilityState === 'visible' && S.booted) emit(); }, 60000);
  setInterval(() => { if (document.visibilityState === 'visible' && S.booted && !Outbox.q.length) revalidate(); }, 5 * 60000);
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); _installEvt = e; });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
  addEventListener('beforeunload', e => { if (Outbox.q.length && Outbox.busy) { e.preventDefault(); e.returnValue = ''; } });
}
init();
