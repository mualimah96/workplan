/* =====================================================================
   WORKPLAN — core.js
   Fondasi SPA: utilitas, tanggal WIB, penyimpanan lokal, API (timeout/retry/
   idempoten), state + outbox optimistik, router hash, komponen UI.
   Pola gas-instant-ux-pro: render dari cache dulu (0 ms), segarkan di latar.
   ===================================================================== */
'use strict';

/* ---------------- Utilitas ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const tmpId = () => 'tmp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 : 0);
const fmtPct = x => (Math.round(x * 10) / 10).toString().replace('.', ',');
const fmtNum = x => Number(x || 0).toLocaleString('id-ID');
function ic(name, cls) {
  const b = (window.ICONS || {})[name];
  if (!b) return '';
  return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + b + '</svg>';
}
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }
function inisial(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?'; }

/* ---------------- Tanggal (selalu WIB) ---------------- */
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HR = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
const _fmtWIB = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
function nowStr() {
  const p = {}; _fmtWIB.formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
  return p.year + '-' + p.month + '-' + p.day + ' ' + (p.hour === '24' ? '00' : p.hour) + ':' + p.minute;
}
const today = () => nowStr().slice(0, 10);
const ymNow = () => nowStr().slice(0, 7);
const p2 = n => (n < 10 ? '0' : '') + n;
function ymdParts(s) { return String(s).slice(0, 10).split('-').map(Number); }
function utc(s) { const [y, m, d] = ymdParts(s); const hm = String(s).slice(11, 16).split(':'); return Date.UTC(y, m - 1, d, +hm[0] || 0, +hm[1] || 0); }
function addDays(ymd, n) { const [y, m, d] = ymdParts(ymd); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
function dow(ymd) { const [y, m, d] = ymdParts(ymd); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
function diffHari(a, b) { return Math.round((utc(String(b).slice(0, 10)) - utc(String(a).slice(0, 10))) / 864e5); }
function menitAntara(a, b) { return Math.round((utc(b) - utc(a)) / 60000); }
function fmtTgl(s, o = {}) {
  if (!s) return '-';
  const [y, m, d] = ymdParts(s);
  let out = d + ' ' + (o.pendek ? BLN[m - 1] : BULAN[m - 1]) + (o.tanpaTahun ? '' : ' ' + y);
  if (o.hari) out = (o.pendek ? HARI[dow(s)].slice(0, 3) : HARI[dow(s)]) + ', ' + out;
  if (o.jam && String(s).length > 10) out += ' • ' + String(s).slice(11, 16) + ' WIB';
  return out;
}
const jam = s => (String(s).length > 10 ? String(s).slice(11, 16) : '');
function namaBulan(ym) { return BULAN[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4); }
function geserBulan(ym, n) { return WPStat.geserBulan(ym, n); }
function akhirBulan(ym) { return ym + '-' + p2(WPStat.hariDalamBulan(ym)); }
function relHari(ymd) {
  const n = diffHari(today(), ymd);
  if (n === 0) return 'Hari ini'; if (n === 1) return 'Besok'; if (n === -1) return 'Kemarin';
  return n > 0 ? 'H-' + n : Math.abs(n) + ' hari lalu';
}
function semester(ym) { const m = +ym.slice(5, 7), y = +ym.slice(0, 4); return m >= 8 ? 'Semester Ganjil ' + y + '/' + (y + 1) : m === 1 ? 'Semester Ganjil ' + (y - 1) + '/' + y : 'Semester Genap ' + (y - 1) + '/' + y; }
function sapaan() { const h = +nowStr().slice(11, 13); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; }

/* ---------------- Penyimpanan lokal (aman dari kuota/private mode) ---------------- */
const LS = 'wp:v1:';
const Store = {
  get(k, d) { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { try { localStorage.removeItem(LS + 'arsip'); localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e2) { } } },
  del(k) { try { localStorage.removeItem(LS + k); } catch (e) { } }
};

/* ---------------- Pengukur kinerja (Perf.table() di console) ---------------- */
const Perf = {
  rows: [],
  add(action, total, server) { this.rows.push({ action, total, server: server == null ? null : server, net: server == null ? null : total - server }); if (this.rows.length > 200) this.rows.shift(); },
  table() { console.table(this.rows.slice(-30)); }
};
window.Perf = Perf;

/* ---------------- API ke Google Apps Script ---------------- */
const READ_ACTIONS = /^(boot|catatanRange|verifikasi|ownerBoot|batch|kalenderInfo|notif\.queue|wa\.device|crm\.detail|de\.prefill|de\.download|de\.list|mig\.scan)$/;
function gasUrl() { return (window.WP_CONFIG && WP_CONFIG.GAS_URL) || ''; }
function gasSiap() { return /^https:\/\/script\.google(usercontent)?\.com\/.+\/exec/.test(gasUrl()) && !/GANTI_DENGAN/.test(gasUrl()); }
async function apiOnce(action, data, timeout, reqId) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeout), t0 = performance.now();
  try {
    const res = await fetch(gasUrl(), {
      method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },            // hindari CORS preflight
      body: JSON.stringify({ action, token: S.token || '', reqId, data: data || {} })
    });
    const text = await res.text();
    try { const j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); return j; }
    catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429 || res.status === 200, message: 'Server membalas bukan JSON (HTTP ' + res.status + '). Pastikan akses Web App = "Anyone".' }; }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus.' };
  } finally { clearTimeout(timer); }
}
async function api(action, data, opt = {}) {
  if (!gasSiap()) return { success: false, message: 'GAS_URL belum diisi di js/config.js', data: { code: 'NO_URL' } };
  const isRead = READ_ACTIONS.test(action);
  const reqId = isRead ? '' : (opt.reqId || uid());
  const tries = opt.tries || (isRead ? 3 : 2);
  let res;
  for (let i = 0; i < tries; i++) {
    if (i) { await new Promise(r => setTimeout(r, 1200 * i)); if (navigator.onLine === false) await waitOnline(15000); }
    res = await apiOnce(action, data, opt.timeout || (isRead ? (i ? 40000 : 25000) : 90000), reqId);
    if (res.success || !res.retryable) break;
  }
  if (!res.success && res.data && res.data.code === 'AUTH' && S.token) onSessionExpired();
  return res;
}
function waitOnline(ms) {
  return new Promise(r => { if (navigator.onLine !== false) return r(); const t = setTimeout(done, ms); function done() { clearTimeout(t); removeEventListener('online', done); r(); } addEventListener('online', done); });
}
let _lastWarm = 0;
function warmUpServer() { if (!gasSiap() || Date.now() - _lastWarm < 60000) return; _lastWarm = Date.now(); fetch(gasUrl() + '?ping=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => { }); }

/* ---------------- State aplikasi ---------------- */
const S = {
  set: {}, ver: '', dari: '', kal: { aktif: true, tertunda: 0 },
  ctn: new Map(), prj: new Map(), tgs: new Map(), arsipRng: {},
  token: '', exp: 0, owner: null, pinBawaan: false,
  route: { name: '', args: [] }, booted: false, online: navigator.onLine !== false,
  ui: Object.assign({ cf: { q: '', kat: '', st: '', pr: '', dari: '', sampai: '', chip: 'semua', urut: 'tenggat', hal: 1 }, bTab: 'semua', kal: null, lap: null, pTab: 'semua', pUrut: 'hariH' }, Store.get('ui', {}))
};
if (S.ui.kal) { delete S.ui.kal.ym; delete S.ui.kal.sel; }
if (S.ui.lap) delete S.ui.lap.ym;
if (S.ui.cf) S.ui.cf.hal = 1;
const KEY = { ctn: 'ID', prj: 'ProjekID', tgs: 'TugasID' };
const TABEL = { Catatan: 'ctn', Projek: 'prj', TugasProjek: 'tgs' };
const isOwner = () => !!S.token && S.exp > Date.now();
function unpack(p) { if (!p || !p.c) return []; return p.r.map(r => { const o = {}; p.c.forEach((k, i) => { o[k] = r[i]; }); return o; }); }
function pack(rows, cols) { return { c: cols, r: rows.map(o => cols.map(k => (o[k] === undefined || o[k] === null ? '' : String(o[k])))) }; }
const COLS = {
  ctn: ['ID', 'Judul', 'Kategori', 'Tenggat', 'TanggalHariPenting', 'Prioritas', 'Status', 'CatatanTambahan', 'ProjekID', 'EventKalenderID', 'EventHariPentingID', 'StatusSinkron', 'SelesaiPada', 'DibuatPada', 'DiubahPada'],
  prj: ['ProjekID', 'NamaProjek', 'TanggalMulai', 'TanggalAcara', 'JamAcara', 'Lokasi', 'Penyelenggara', 'Status', 'Deskripsi', 'EventKalenderID', 'StatusSinkron', 'DibuatPada', 'DiubahPada'],
  tgs: ['TugasID', 'ProjekID', 'NamaTugas', 'Tenggat', 'Status', 'EventKalenderID', 'StatusSinkron', 'SelesaiPada', 'DibuatPada', 'DiubahPada']
};

/** Isi state dari data boot (server atau cache), lalu terapkan ulang outbox yang belum terkirim. */
function hydrate(d) {
  S.set = d.set || S.set; S.ver = d.ver; S.dari = d.dari; S.kal = d.kalender || S.kal;
  const arsip = [...S.ctn.values()].filter(c => c._arsip && c.Tenggat < d.dari);
  S.ctn = new Map(); S.prj = new Map(); S.tgs = new Map();
  unpack(d.catatan).forEach(o => S.ctn.set(o.ID, o));
  arsip.forEach(o => { if (!S.ctn.has(o.ID)) S.ctn.set(o.ID, o); });
  unpack(d.projek).forEach(o => S.prj.set(o.ProjekID, o));
  unpack(d.tugas).forEach(o => S.tgs.set(o.TugasID, o));
  Outbox.q.forEach(op => applyOp(Outbox.terjemah(op), true));
}
function simpanBootLokal() {
  const ctnUtama = [...S.ctn.values()].filter(c => !c._arsip && !c._p);
  Store.set('boot', { t: Date.now(), d: { ver: S.ver, dari: S.dari, set: S.set, kalender: S.kal, catatan: pack(ctnUtama, COLS.ctn), projek: pack([...S.prj.values()].filter(x => !x._p), COLS.prj), tugas: pack([...S.tgs.values()].filter(x => !x._p), COLS.tgs) } });
}
const simpanBootNanti = debounce(simpanBootLokal, 600);

/* ---------------- Turunan data ---------------- */
const WARNA = ['ungu', 'pink', 'hijau', 'oranye', 'biru', 'teal', 'kuning', 'abu'];
function kategoriList() { return (S.set.KATEGORI && S.set.KATEGORI.length ? S.set.KATEGORI : [{ nama: 'Flayer', warna: 'ungu', ikon: 'brush' }, { nama: 'Konten Medsos', warna: 'pink', ikon: 'smartphone' }, { nama: 'Rapat', warna: 'hijau', ikon: 'users' }, { nama: 'Lainnya', warna: 'oranye', ikon: 'folder' }]); }
function katInfo(nama) { return kategoriList().find(k => k.nama === nama) || { nama: nama || 'Lainnya', warna: 'abu', ikon: 'tag' }; }
function katChip(nama) { const k = katInfo(nama); return '<span class="chip c-' + k.warna + '">' + esc(k.nama) + '</span>'; }
function prioPill(p) { return p === 'Penting' ? '<span class="prio">' + ic('star') + 'Penting</span>' : '<span class="prio biasa">Biasa</span>'; }
function statusBadge(st, telat) {
  if (st === 'Selesai') return '<span class="badge b-ok">' + ic('check-check') + 'Selesai</span>';
  if (telat) return '<span class="badge b-late">' + ic('triangle-alert') + 'Terlambat</span>';
  if (st === 'Sedang Dikerjakan') return '<span class="badge b-run">Sedang Dikerjakan</span>';
  return '<span class="badge b-idle">Belum</span>';
}
function projekBadge(st) { return st === 'Selesai' ? '<span class="badge b-ok">' + ic('circle-check') + 'Selesai</span>' : st === 'Berjalan' ? '<span class="badge b-run">Sedang Berjalan</span>' : '<span class="badge b-lav">Tahap Persiapan</span>'; }
const isTelat = (x, now = nowStr()) => x.Status !== 'Selesai' && !!x.Tenggat && x.Tenggat < now;
function lamaTelat(t) { const n = diffHari(t, today()); if (n >= 1) return 'Terlambat ' + n + ' hari'; const m = menitAntara(t, nowStr()); return m < 60 ? 'Terlambat ' + m + ' mnt' : 'Terlambat ' + Math.floor(m / 60) + ' jam'; }
function semuaCatatan() { return [...S.ctn.values()]; }
function tugasProjek(pid) { return [...S.tgs.values()].filter(t => t.ProjekID === pid).sort((a, b) => (a.Tenggat || '9') < (b.Tenggat || '9') ? -1 : 1); }
function progres(pid) { const t = tugasProjek(pid), s = t.filter(x => x.Status === 'Selesai').length; return { total: t.length, selesai: s, persen: pct(s, t.length) }; }
/** Catatan + tugas projek dalam satu bentuk untuk Beranda/Kalender. */
function itemGabungan() {
  const out = [];
  S.ctn.forEach(c => out.push({ kind: 'ctn', id: c.ID, judul: c.Judul, kategori: c.Kategori, tenggat: c.Tenggat, status: c.Status, prioritas: c.Prioritas, projek: c.ProjekID ? S.prj.get(c.ProjekID) : null, rec: c }));
  S.tgs.forEach(t => { if (!t.Tenggat) return; const p = S.prj.get(t.ProjekID); out.push({ kind: 'tgs', id: t.TugasID, judul: t.NamaTugas, kategori: '', tenggat: t.Tenggat, status: t.Status, prioritas: '', projek: p, rec: t }); });
  return out;
}
/** Hari penting (dari catatan) + hari-H projek, mulai hari ini. */
function hariPentingList(dari = today(), sampai = '9999') {
  const out = [], seen = {};
  S.prj.forEach(p => { if (p.TanggalAcara >= dari && p.TanggalAcara <= sampai && p.Status !== 'Selesai') { out.push({ tgl: p.TanggalAcara, judul: p.NamaProjek, jenis: 'projek', id: p.ProjekID, sub: [p.Lokasi, p.Penyelenggara].filter(Boolean).join(' • ') }); seen[p.TanggalAcara + '|' + p.ProjekID] = 1; } });
  S.ctn.forEach(c => {
    if (!c.TanggalHariPenting || c.TanggalHariPenting < dari || c.TanggalHariPenting > sampai) return;
    if (c.ProjekID && seen[c.TanggalHariPenting + '|' + c.ProjekID]) return;
    const k = c.TanggalHariPenting + '|' + c.Judul.toLowerCase(); if (seen[k]) return; seen[k] = 1;
    out.push({ tgl: c.TanggalHariPenting, judul: c.Judul, jenis: 'catatan', id: c.ID, sub: c.Kategori + ' • ' + (c.Status === 'Selesai' ? 'konten siap' : 'persiapan konten') });
  });
  return out.sort((a, b) => (a.tgl < b.tgl ? -1 : a.tgl > b.tgl ? 1 : 0));
}

/* ---------------- Outbox optimistik (tampilan berubah dulu, server menyusul) ---------------- */
const CTN_F = ['Judul', 'Kategori', 'Tenggat', 'TanggalHariPenting', 'Prioritas', 'Status', 'CatatanTambahan', 'ProjekID'];
const PRJ_F = ['NamaProjek', 'TanggalMulai', 'TanggalAcara', 'JamAcara', 'Lokasi', 'Penyelenggara', 'Status', 'Deskripsi'];
const TGS_F = ['ProjekID', 'NamaTugas', 'Tenggat', 'Status'];
function pick(o, f) { const x = {}; f.forEach(k => { if (o[k] !== undefined) x[k] = o[k]; }); return x; }
function stSinkronLokal() { return S.set.KALENDER_AKTIF === 'YA' ? 'PENDING' : 'NONAKTIF'; }

function applyOp(op, replay) {
  const d = op.d, now = nowStr();
  const up = (map, key, id, base, f) => {
    const ex = map.get(id);
    const rec = Object.assign({}, ex || base, pick(d, f), { _p: 1, DiubahPada: now, StatusSinkron: stSinkronLokal() });
    rec[key] = id; map.set(id, rec); return rec;
  };
  switch (op.t) {
    case 'catatan.save': {
      if (replay && !S.ctn.has(d.ID) && !/^tmp_/.test(d.ID)) return;
      const ex = S.ctn.get(d.ID);
      const r = up(S.ctn, 'ID', d.ID, { DibuatPada: now, EventKalenderID: '', EventHariPentingID: '', SelesaiPada: '' }, CTN_F);
      r.SelesaiPada = r.Status === 'Selesai' ? (ex && ex.SelesaiPada) || now : '';
      break;
    }
    case 'catatan.status': {
      const ex = S.ctn.get(d.ID); if (!ex) return;
      const r = Object.assign({}, ex, { Status: d.Status, SelesaiPada: d.Status === 'Selesai' ? (d.SelesaiPada || now) : '', _p: 1, StatusSinkron: stSinkronLokal(), DiubahPada: now });
      if (d.Status !== 'Selesai') r._sebelum = undefined; else if (ex.Status !== 'Selesai') r._sebelum = ex.Status;
      S.ctn.set(d.ID, r); break;
    }
    case 'catatan.delete': S.ctn.delete(d.ID); break;
    case 'projek.save': {
      if (replay && !S.prj.has(d.ProjekID) && !/^tmp_/.test(d.ProjekID)) return;
      up(S.prj, 'ProjekID', d.ProjekID, { DibuatPada: now, EventKalenderID: '' }, PRJ_F); break;
    }
    case 'projek.delete': {
      S.prj.delete(d.ProjekID);
      [...S.tgs.values()].forEach(t => { if (t.ProjekID === d.ProjekID) S.tgs.delete(t.TugasID); });
      S.ctn.forEach((c, k) => { if (c.ProjekID === d.ProjekID) S.ctn.set(k, Object.assign({}, c, { ProjekID: '' })); });
      break;
    }
    case 'tugas.save': {
      if (replay && !S.tgs.has(d.TugasID) && !/^tmp_/.test(d.TugasID)) return;
      const ex = S.tgs.get(d.TugasID);
      const r = up(S.tgs, 'TugasID', d.TugasID, { DibuatPada: now, EventKalenderID: '', SelesaiPada: '' }, TGS_F);
      r.SelesaiPada = r.Status === 'Selesai' ? (ex && ex.SelesaiPada) || now : '';
      break;
    }
    case 'tugas.status': {
      const ex = S.tgs.get(d.TugasID); if (!ex) return;
      S.tgs.set(d.TugasID, Object.assign({}, ex, { Status: d.Status, SelesaiPada: d.Status === 'Selesai' ? now : '', _p: 1, StatusSinkron: stSinkronLokal() }));
      break;
    }
    case 'tugas.delete': S.tgs.delete(d.TugasID); break;
  }
}

const Outbox = {
  q: Store.get('outbox', []), idMap: Store.get('idmap', {}), busy: false, timer: null, backoff: 0, gagalBeruntun: 0,
  save() { Store.set('outbox', this.q); Store.set('idmap', this.idMap); },
  terjemah(op) {
    const m = this.idMap, d = Object.assign({}, op.d);
    ['ID', 'ProjekID', 'TugasID'].forEach(k => { if (d[k] && m[d[k]]) d[k] = m[d[k]]; });
    return Object.assign({}, op, { d });
  },
  push(t, d) {
    if (!isOwner()) { toast('Masuk sebagai pemilik untuk mengubah data.', 'info'); openLogin(); return null; }
    const op = { opId: uid(), t, d: JSON.parse(JSON.stringify(d)) };
    applyOp(op);
    this.q.push(op); this.save();
    emit(); simpanBootNanti();
    this.jadwal(350);
    return op;
  },
  jadwal(ms) { clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), ms); },
  async flush() {
    if (this.busy || !this.q.length) return;
    if (!isOwner()) { renderSync(); return; }
    if (navigator.onLine === false) { renderSync(); return; }
    this.busy = true; renderSync();
    const batch = this.q.slice(0, 25).map(op => this.terjemah(op));
    const res = await api('sync', { ops: batch }, { reqId: 'sync-' + hashStr(batch.map(o => o.opId).join('|')).replace(/[^0-9a-z]/gi, ''), tries: 1, timeout: 90000 });
    this.busy = false;
    if (res.success) {
      this.backoff = 0; this.gagalBeruntun = 0;
      const selesai = new Set(); let perluSegar = false, pesanGagal = '';
      (res.data.results || []).forEach(r => {
        selesai.add(r.opId);
        if (r.map) Object.keys(r.map).forEach(tmp => gantiTmp(tmp, r.map[tmp]));
        if (!r.ok) { perluSegar = true; pesanGagal = r.message; return; }
        if (r.rec && r.tabel) { const mk = TABEL[r.tabel], map = S[mk]; map.set(r.rec[KEY[mk]], Object.assign({}, r.rec)); }
      });
      this.q = this.q.filter(o => !selesai.has(o.opId));
      this.q.forEach(op => applyOp(this.terjemah(op), true));       // perubahan yang masih antre tetap menang
      this.save();
      if (pesanGagal) toast('Sebagian perubahan ditolak server', 'err', { sub: pesanGagal });
      const k = res.data.kalender || {};
      if (k.gagal) toast('Tersimpan, tetapi Google Kalender gagal diperbarui', 'warn', { sub: (k.pesan || '') + ' — coba "Sinkron Ulang".' });
      S.kal.tertunda = [...S.ctn.values(), ...S.prj.values(), ...S.tgs.values()].filter(x => x.StatusSinkron === 'PENDING' || x.StatusSinkron === 'GAGAL').length;
      emit(); simpanBootNanti();
      if (perluSegar) revalidate(true);
      if (this.q.length) this.jadwal(60); else segarNanti();
    } else if (res.data && res.data.code === 'AUTH') {
      renderSync();
    } else {
      this.gagalBeruntun++;
      this.backoff = Math.min(60000, (this.backoff || 1500) * 2);
      if (!res.network && this.gagalBeruntun >= 3) toast('Perubahan belum tersimpan ke server', 'err', { sub: res.message, aksi: 'Coba lagi', fn: () => this.flush() });
      this.jadwal(this.backoff);
    }
    renderSync();
  }
};
function gantiTmp(tmp, id) {
  if (!tmp || tmp === id) return;
  Outbox.idMap[tmp] = id;
  ['ctn', 'prj', 'tgs'].forEach(mk => {
    const map = S[mk];
    if (map.has(tmp)) { const r = Object.assign({}, map.get(tmp)); r[KEY[mk]] = id; map.delete(tmp); map.set(id, r); }
  });
  S.ctn.forEach((c, k) => { if (c.ProjekID === tmp) S.ctn.set(k, Object.assign({}, c, { ProjekID: id })); });
  S.tgs.forEach((t, k) => { if (t.ProjekID === tmp) S.tgs.set(k, Object.assign({}, t, { ProjekID: id })); });
  if (location.hash.indexOf(tmp) > -1) history.replaceState(null, '', location.hash.replace(tmp, id));
  if (S.route.args) S.route.args = S.route.args.map(a => (a === tmp ? id : a));
  document.dispatchEvent(new CustomEvent('wp:id', { detail: { tmp, id } }));
}

/* ---------------- Boot & penyegaran (stale-while-revalidate) ---------------- */
let _revalidating = false, _segarTimer = null;
function segarNanti() { clearTimeout(_segarTimer); _segarTimer = setTimeout(() => revalidate(), 2500); }
async function revalidate(force) {
  if (_revalidating) return;
  _revalidating = true;
  const res = await api('boot', force ? {} : { ver: S.ver, dari: S.dari });
  _revalidating = false;
  if (!res.success) {
    if (!S.booted) tampilGagalBoot(res.message);
    return res;
  }
  if (!res.data.same) {
    const h0 = S._hash, h = hashStr(JSON.stringify([res.data.ver, res.data.catatan && res.data.catatan.r.length]));
    hydrate(res.data); simpanBootLokal(); S._hash = h;
    if (!S.booted || h0 !== h || force) emit();
  }
  if (!S.booted) { S.booted = true; tutupSplash(); route(); }
  return res;
}
/** Muat catatan bulan lama (di luar jendela boot) sekali per versi data. */
async function pastikanRentang(dari, sampai) {
  if (!S.dari || dari >= S.dari) return true;
  const akhir = sampai < S.dari ? sampai : addDays(S.dari, -1);
  const k = dari + '_' + akhir;
  if (S.arsipRng[k] === S.ver) return true;
  S._rngCoba = S._rngCoba || {};
  if (S._rngCoba[k] && Date.now() - S._rngCoba[k] < 30000) return false;      // cegah permintaan berulang
  S._rngCoba[k] = Date.now();
  const res = await api('catatanRange', { dari, sampai: akhir });
  if (!res.success) { toast('Gagal memuat arsip catatan', 'err', { sub: res.message }); return false; }
  delete S._rngCoba[k];
  unpack(res.data.catatan).forEach(o => { o._arsip = 1; if (!S.ctn.has(o.ID)) S.ctn.set(o.ID, o); });
  S.arsipRng[k] = S.ver;
  emit();
  return true;
}

/* ---------------- Data pemilik (CRM, dokumen, notifikasi) ---------------- */
function setOwnerData(o) { if (!o) return; S.owner = o; Store.set('owner', { t: Date.now(), d: o }); }
async function segarkanOwner(force) {
  if (!isOwner()) return;
  const c = Store.get('owner', null);
  if (c && !S.owner) S.owner = c.d;
  if (c && !force && Date.now() - c.t < 60000) return;
  const res = await api('ownerBoot', {});
  if (res.success) { setOwnerData(res.data); emit(); }
}

/* ---------------- Render terjadwal ---------------- */
let _rafRender = 0;
function emit() {
  if (_rafRender) return;
  _rafRender = requestAnimationFrame(() => {
    _rafRender = 0;
    renderChrome();
    const def = Pages[S.route.name];
    if (def && !def.statis && S.booted) { const el = $('.page[data-page="' + S.route.name + '"]'); if (el && !el._statis) def.render(el, ...S.route.args); }
  });
}

/* ---------------- Router hash ---------------- */
const Pages = {};
function page(name, def) { Pages[name] = def; }
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
const _scroll = {};
function route() {
  if (!S.booted) return;
  const raw = location.hash.replace(/^#\/?/, '') || 'beranda';
  const [name, ...rest] = raw.split('/');
  const def = Pages[name];
  if (!def) { go('#/beranda'); return; }
  if (def.owner && !isOwner()) { history.replaceState(null, '', '#/beranda'); toast('Menu ini khusus pemilik. Masukkan PIN untuk membuka.', 'info'); openLogin(() => go('#/' + raw)); route(); return; }
  if (S.route.name) _scroll[S.route.name] = window.scrollY;
  if (S._curHash !== location.hash) { S._prevHash = S._curHash; S._curHash = location.hash; }
  let el = $('.page[data-page="' + name + '"]');
  if (!el) { el = document.createElement('section'); el.className = 'page'; el.dataset.page = name; $('#content').appendChild(el); }
  const pindah = S.route.name !== name || JSON.stringify(S.route.args) !== JSON.stringify(rest.map(decodeURIComponent));
  S.route = { name, args: rest.map(decodeURIComponent) };
  $$('.page').forEach(p => { p.hidden = p !== el; });
  if (pindah) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
  def.render(el, ...S.route.args);
  renderChrome();
  document.title = (def.judul ? def.judul + ' • ' : '') + 'WORKPLAN';
  window.scrollTo(0, def.statis ? 0 : (_scroll[name] || 0) * (pindah ? 0 : 1));
}
window.addEventListener('hashchange', route);

/* ---------------- Komponen UI: toast, modal, konfirmasi, menu ---------------- */
function toast(msg, type = 'ok', o = {}) {
  const box = $('#toasts'); if (!box) return;
  const icon = { ok: 'circle-check', err: 'circle-alert', info: 'info', warn: 'triangle-alert', sync: 'refresh-cw' }[type] || 'info';
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<div class="ti">' + ic(icon) + '</div><div class="tx">' + esc(msg) + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</div>' + (o.aksi ? '<button class="ta-btn">' + esc(o.aksi) + '</button>' : '');
  if (o.aksi) el.querySelector('.ta-btn').onclick = () => { o.fn && o.fn(); tutup(); };
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  const tutup = () => { el.classList.add('out'); setTimeout(() => el.remove(), 180); };
  setTimeout(tutup, o.ms || (type === 'err' ? 6000 : o.aksi ? 5500 : 3200));
  return el;
}
function modal(o) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = '<div class="modal ' + (o.wide ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.judul || '') + '">' +
    '<div class="modal-h"><div>' + (o.kick ? '<div class="xs muted b">' + o.kick + '</div>' : '') + '<h2 class="h3">' + esc(o.judul || '') + '</h2></div><button class="icon-btn" data-x aria-label="Tutup">' + ic('x') + '</button></div>' +
    '<div class="modal-b">' + (o.isi || '') + '</div>' + (o.kaki ? '<div class="modal-f">' + o.kaki + '</div>' : '') + '</div>';
  const close = (v) => { ov.remove(); document.removeEventListener('keydown', onKey); o.onClose && o.onClose(v); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  ov.querySelector('[data-x]').onclick = () => close();
  document.addEventListener('keydown', onKey);
  document.body.appendChild(ov);
  const f = ov.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 30);
  ov.close = close;
  return ov;
}
function konfirmasi(o) {
  return new Promise(res => {
    const m = modal({
      judul: o.judul || 'Konfirmasi', isi: '<p class="muted" style="margin:0 0 6px">' + o.teks + '</p>',
      kaki: '<button class="btn btn-ghost" data-n>Batal</button><button class="btn ' + (o.bahaya ? 'btn-danger' : 'btn-primary') + '" data-y autofocus>' + esc(o.ok || 'Ya, lanjutkan') + '</button>',
      onClose: v => res(!!v)
    });
    m.querySelector('[data-n]').onclick = () => m.close(false);
    m.querySelector('[data-y]').onclick = () => m.close(true);
  });
}
function menuPop(anchor, items) {
  $$('.menu-pop').forEach(x => x.remove());
  const m = document.createElement('div');
  m.className = 'menu-pop';
  m.innerHTML = items.filter(Boolean).map((it, i) => '<button data-i="' + i + '" class="' + (it.bahaya ? 'danger' : '') + '">' + ic(it.ikon || 'circle') + esc(it.label) + '</button>').join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = clamp(r.right - w, 8, innerWidth - w - 8) + 'px';
  m.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
  const list = items.filter(Boolean);
  m.onclick = e => { const b = e.target.closest('button'); if (!b) return; m.remove(); list[+b.dataset.i].fn(); };
  setTimeout(() => document.addEventListener('click', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
}
function setBusy(btn, on, teks) {
  if (!btn) return;
  if (on) { btn.dataset.t = btn.innerHTML; btn.classList.add('busy'); btn.innerHTML = ic('loader-circle', 'spin') + (teks || 'Memproses…'); }
  else { btn.classList.remove('busy'); if (btn.dataset.t) btn.innerHTML = btn.dataset.t; }
}
function unduhBlob(blob, nama) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
function csvDari(rows) {
  return '﻿' + rows.map(r => r.map(v => { const s = String(v === null || v === undefined ? '' : v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
}
function parseCsv(text) {
  text = String(text).replace(/^﻿/, '');
  const delim = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  const data = rows.filter(r => r.some(x => String(x).trim() !== ''));
  if (!data.length) return [];
  const h = data[0].map(x => x.trim());
  return data.slice(1).map(r => { const o = {}; h.forEach((k, i) => { o[k] = (r[i] || '').trim(); }); return o; });
}

/* ---------------- Grafik ringan (SVG, tanpa pustaka) ---------------- */
function ringSvg(persen, o = {}) {
  const s = o.size || 96, w = o.stroke || 10, r = (s - w) / 2, c = 2 * Math.PI * r, v = clamp(persen, 0, 100);
  return '<div class="ring" style="width:' + s + 'px;height:' + s + 'px"><svg width="' + s + '" height="' + s + '"><circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="' + (o.bg || '#E8F0FF') + '" stroke-width="' + w + '"/>' +
    '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="' + (o.color || '#2F6BFF') + '" stroke-width="' + w + '" stroke-linecap="round" stroke-dasharray="' + (c * v / 100) + ' ' + c + '"/></svg>' +
    '<div class="rv"><div><b style="font-size:' + (o.font || 24) + 'px">' + (o.label !== undefined ? o.label : Math.round(v) + '%') + '</b>' + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</div></div></div>';
}
function donutSvg(parts, o = {}) {
  const s = o.size || 210, w = o.stroke || 30, r = (s - w) / 2, c = 2 * Math.PI * r, tot = parts.reduce((a, p) => a + p.v, 0) || 1;
  let off = 0;
  const seg = parts.filter(p => p.v > 0).map(p => { const len = c * p.v / tot, gap = parts.filter(x => x.v > 0).length > 1 ? 3 : 0; const el = '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="' + p.c + '" stroke-width="' + w + '" stroke-dasharray="' + Math.max(0, len - gap) + ' ' + c + '" stroke-dashoffset="' + (-off) + '"><title>' + esc(p.l) + ': ' + p.v + '</title></circle>'; off += len; return el; }).join('');
  return '<div class="ring" style="width:' + s + 'px;height:' + s + 'px"><svg width="' + s + '" height="' + s + '"><circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="#EEF2F7" stroke-width="' + w + '"/>' + seg + '</svg><div class="rv"><div><b style="font-size:32px">' + (o.label || '') + '</b><small>' + (o.sub || '') + '</small></div></div></div>';
}
function barsSvg(data, o = {}) {
  // data = [{l, a, b}] → batang ganda (a = tuntas, b = proses)
  const W = 520, H = 230, pl = 30, pb = 30, pt = 10, maxV = Math.max(4, ...data.map(d => Math.max(d.a, d.b)));
  const step = Math.ceil(maxV / 4), top = step * 4, cw = (W - pl) / data.length, bw = Math.min(30, cw / 3.2);
  const y = v => pt + (H - pt - pb) * (1 - v / top);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = step * i; g += '<line x1="' + pl + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#E3ECF8" stroke-dasharray="' + (i ? '3 4' : '0') + '"/><text x="' + (pl - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>'; }
  data.forEach((d, i) => {
    const cx = pl + cw * i + cw / 2, x1 = cx - bw - 2, x2 = cx + 2;
    g += '<g class="col"><rect x="' + (pl + cw * i) + '" y="0" width="' + cw + '" height="' + H + '" fill="transparent"/>' +
      '<rect x="' + x1 + '" y="' + y(d.a) + '" width="' + bw + '" height="' + (y(0) - y(d.a)) + '" rx="6" fill="' + (o.ca || '#2F6BFF') + '"/>' +
      '<rect x="' + x2 + '" y="' + y(d.b) + '" width="' + bw + '" height="' + (y(0) - y(d.b)) + '" rx="6" fill="' + (o.cb || '#C7D7FE') + '"/>' +
      '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" style="font-weight:600">' + esc(d.l) + '</text>' +
      '<g class="tip"><rect x="' + (cx - 46) + '" y="' + Math.max(0, y(Math.max(d.a, d.b)) - 34) + '" width="92" height="26" rx="8" fill="#14213D"/><text x="' + cx + '" y="' + Math.max(17, y(Math.max(d.a, d.b)) - 16) + '" text-anchor="middle" style="fill:#fff;font-weight:700">' + d.a + ' tuntas • ' + d.b + '</text></g></g>';
  });
  return '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Grafik batang') + '">' + g + '</svg>';
}

/* ---------------- Masuk / keluar pemilik ---------------- */
function openLogin(lanjut) {
  if (isOwner()) { lanjut && lanjut(); return; }
  if (!gasSiap()) { toast('GAS_URL belum diisi di js/config.js', 'err'); return; }
  let pin = '';
  const m = modal({
    judul: 'Masuk sebagai Pemilik', kick: ic('lock', 'sm') + ' Mode Pemilik',
    isi: '<p class="muted small" style="margin:0;text-align:center">Masukkan PIN untuk menambah, mengubah, dan menghapus data. Penonton tetap bisa melihat tanpa PIN.</p>' +
      '<div class="pin-dots" id="pin-dots">' + '<i></i>'.repeat(6) + '</div><div class="xs" id="pin-msg" style="text-align:center;min-height:22px;color:var(--late);font-weight:600"></div>' +
      '<input id="pin-in" class="sr" inputmode="numeric" autocomplete="one-time-code" maxlength="8" aria-label="PIN">' +
      '<div class="pinpad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => '<button data-k="' + n + '">' + n + '</button>').join('') + '<button data-k="del" aria-label="Hapus">' + ic('arrow-left') + '</button><button data-k="0">0</button><button data-k="ok" style="background:var(--primary);color:#fff" aria-label="Masuk">' + ic('arrow-right') + '</button></div>'
  });
  const dots = m.querySelector('#pin-dots'), msg = m.querySelector('#pin-msg'), inp = m.querySelector('#pin-in');
  const gambar = () => { dots.innerHTML = '<i></i>'.repeat(Math.max(6, pin.length)); [...dots.children].forEach((d, i) => d.classList.toggle('on', i < pin.length)); };
  let sibuk = false;
  const kirim = async () => {
    if (sibuk || pin.length < 4) return;
    sibuk = true; msg.style.color = 'var(--text-2)'; msg.textContent = 'Memeriksa PIN…';
    const res = await api('login', { pin, appUrl: location.origin + location.pathname });
    sibuk = false;
    if (res.success) {
      S.token = res.data.token; S.exp = res.data.exp; S.pinBawaan = res.data.pinBawaan;
      Store.set('auth', { token: S.token, exp: S.exp });
      setOwnerData(res.data.owner);
      m.close(); toast('Mode Pemilik aktif', 'ok', { sub: 'Fitur tambah/ubah/hapus kini tersedia.' });
      if (S.pinBawaan) setTimeout(() => toast('PIN masih bawaan (123456)', 'warn', { sub: 'Segera ganti di menu Pengaturan.', aksi: 'Ganti', fn: () => go('#/pengaturan') }), 900);
      emit(); Outbox.flush(); lanjut && lanjut();
    } else {
      pin = ''; gambar(); msg.style.color = 'var(--late)'; msg.textContent = res.message;
      dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
    }
  };
  m.querySelector('.pinpad').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = b.dataset.k;
    if (k === 'del') pin = pin.slice(0, -1); else if (k === 'ok') return kirim(); else if (pin.length < 8) pin += k;
    gambar(); if (pin.length === 6) kirim();
  };
  inp.oninput = () => { pin = inp.value.replace(/\D/g, '').slice(0, 8); gambar(); if (pin.length === 6) kirim(); };
  m.addEventListener('keydown', e => { if (/^\d$/.test(e.key) && pin.length < 8) { pin += e.key; gambar(); if (pin.length === 6) kirim(); } else if (e.key === 'Backspace') { pin = pin.slice(0, -1); gambar(); } else if (e.key === 'Enter') kirim(); });
  m.querySelector('.modal').tabIndex = -1;
  setTimeout(() => m.querySelector('.modal').focus(), 50);
}
async function keluar() {
  if (Outbox.q.length && !(await konfirmasi({ judul: 'Masih ada perubahan menunggu', teks: Outbox.q.length + ' perubahan belum terkirim ke server. Keluar sekarang akan membuangnya.', ok: 'Keluar & buang', bahaya: true }))) return;
  Outbox.q = []; Outbox.save();
  S.token = ''; S.exp = 0; S.owner = null;
  Store.del('auth'); Store.del('owner');
  toast('Keluar dari Mode Pemilik', 'info', { sub: 'Sekarang dalam mode lihat saja.' });
  revalidate(true);
  if (Pages[S.route.name] && Pages[S.route.name].owner) go('#/beranda'); else emit();
}
function onSessionExpired() {
  if (!S.token) return;
  S.token = ''; S.exp = 0; Store.del('auth');
  toast('Sesi pemilik berakhir', 'warn', { sub: 'Masukkan PIN lagi untuk melanjutkan.', aksi: 'Masuk', fn: () => openLogin() });
  emit();
}

/* ---------------- Aksi global (event delegation) ---------------- */
const Aksi = {};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = Aksi[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
