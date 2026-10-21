/* =====================================================================
   WORKPLAN — pages.js
   Halaman utama: Beranda, Catatan Harian (+form), Projek/Event (+detail),
   Kalender Bulanan, Laporan & Rekap, Pengaturan, Verifikasi dokumen.
   Semua halaman merender dari state lokal → perpindahan instan tanpa spinner.
   ===================================================================== */
'use strict';

/** Ganti isi bagian halaman hanya bila berubah (hindari kedip & kehilangan fokus). */
function part(el, key, html) {
  const t = el.querySelector('[data-part="' + key + '"]');
  if (t && t._h !== html) { t.innerHTML = html; t._h = html; }
}
const byTenggat = (a, b) => ((a.tenggat || a.Tenggat || '') < (b.tenggat || b.Tenggat || '') ? -1 : 1);
/** Posisi "lengket": item yang baru dicentang tidak melompat sampai pengguna berpindah halaman. */
const Lengket = { m: {}, r: '' };
function lengket(id, nilai) { if (Lengket.r !== location.hash) { Lengket.m = {}; Lengket.r = location.hash; } if (!(id in Lengket.m)) Lengket.m[id] = nilai; return Lengket.m[id]; }
function nilaiLengket(id, nilai) { if (Lengket.r !== location.hash) { Lengket.m = {}; Lengket.r = location.hash; } return id in Lengket.m ? Lengket.m[id] : nilai; }
function syncTag(r) {
  if (r._p) return '<span class="sync-tag wait">' + ic('loader-circle', 'sm spin') + 'Menyimpan…</span>';
  const s = r.StatusSinkron;
  if (s === 'OK') return '<span class="sync-tag ok">' + ic('calendar-check', 'sm') + 'Tersinkron Google Kalender</span>';
  if (s === 'GAGAL') return '<span class="sync-tag bad">' + ic('circle-alert', 'sm') + 'Gagal sinkron kalender</span>';
  if (s === 'PENDING') return '<span class="sync-tag wait">' + ic('refresh-cw', 'sm') + 'Menunggu sinkron</span>';
  if (s === 'CONTOH') return '<span class="sync-tag">' + ic('sparkles', 'sm') + 'Data contoh</span>';
  return '<span class="sync-tag">' + ic('calendar', 'sm') + 'Kalender nonaktif</span>';
}
function chkBtn(kind, id, done) {
  return '<button class="chk ' + (done ? 'on ok' : '') + (isOwner() ? '' : ' ro') + '" data-act="toggle" data-kind="' + kind + '" data-id="' + esc(id) + '" aria-pressed="' + done + '" aria-label="' + (done ? 'Batalkan selesai' : 'Tandai selesai') + '"><span>' + ic('check') + '</span></button>';
}
/** Bentuk seragam untuk catatan harian & tugas event. */
function itemCtn(c) { return { kind: 'ctn', id: c.ID, judul: c.Judul, kategori: c.Kategori, tenggat: c.Tenggat || '', status: c.Status, prioritas: c.Prioritas, projek: c.ProjekID ? S.prj.get(c.ProjekID) || null : null, rec: c }; }
function itemTgs(t) { return { kind: 'tgs', id: t.TugasID, judul: t.NamaTugas, kategori: '', tenggat: t.Tenggat || '', status: t.Status, prioritas: '', projek: S.prj.get(t.ProjekID) || null, rec: t }; }
function semuaItem() { const out = []; S.ctn.forEach(c => out.push(itemCtn(c))); S.tgs.forEach(t => out.push(itemTgs(t))); return out; }
/** Tugas event = checklist projek/event + catatan yang dikaitkan ke event. */
const isEventItem = x => x.kind === 'tgs' || !!x.projek;
const tglSelesai = x => String(x.rec.SelesaiPada || (x.status === 'Selesai' ? x.tenggat : '') || '').slice(0, 10);
/** Urutan tetap (tenggat lalu ID) — mencentang tidak memindahkan posisi item. */
function urutStabil(a, b) { const ta = a.tenggat || '9999', tb = b.tenggat || '9999'; return ta < tb ? -1 : ta > tb ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }
function waktuSelesai(s, td) { if (!s) return ''; return String(s).slice(0, 10) === td ? jam(s) : fmtTgl(s, { pendek: true, tanpaTahun: true }) + (jam(s) ? ' ' + jam(s) : ''); }
/** Baris tugas ringkas (Beranda, Catatan, Kalender, Detail Projek). Item selesai tetap tampil dengan centang hijau. */
function taskRow(x, o = {}) {
  const now = nowStr(), td = today(), done = x.status === 'Selesai', telat = !done && x.tenggat && x.tenggat < now;
  const meta = [];
  if (x.kind === 'ctn' && !o.tanpaKat) meta.push(katChip(x.kategori));
  if (x.prioritas === 'Penting') meta.push('<span class="prio">' + ic('star') + 'Penting</span>');
  if (x.projek && !o.tanpaProjek) meta.push('<span class="chip c-biru">' + ic('folder-open') + esc(x.projek.NamaProjek) + '</span>');
  if (done) meta.push('<span class="ok-at">' + ic('circle-check', 'sm') + 'Selesai' + (x.rec.SelesaiPada ? ' ' + waktuSelesai(x.rec.SelesaiPada, td) : '') + '</span>');
  else if (x.tenggat) meta.push('<span class="tm' + (telat ? ' late' : '') + '">' + ic(telat ? 'alarm-clock' : 'clock', 'sm') + (o.tanggal || x.tenggat.slice(0, 10) !== td ? fmtTgl(x.tenggat, { pendek: true, tanpaTahun: true }) + ', ' : '') + jam(x.tenggat) + '</span>');
  else meta.push('<span class="tm">' + ic('clock', 'sm') + 'Tanpa tenggat</span>');
  if (telat) meta.push('<span class="badge b-late">' + ic('triangle-alert') + esc(lamaTelat(x.tenggat)) + '</span>');
  else if (!done && x.status === 'Sedang Dikerjakan') meta.push('<span class="badge b-run">' + ic('hourglass') + 'Dikerjakan</span>');
  const note = o.catatan && x.rec.CatatanTambahan ? '<div class="task-note">' + esc(String(x.rec.CatatanTambahan).split('\n')[0]) + '</div>' : '';
  return '<div class="task ' + (done ? 'done' : telat ? 'late' : x.prioritas === 'Penting' ? 'imp' : '') + (x.rec._p ? ' pending' : '') + '">' + chkBtn(x.kind, x.id, done) +
    '<div class="task-main"><div class="task-title" data-act="buka" data-kind="' + x.kind + '" data-id="' + esc(x.id) + '">' + esc(x.judul) + '</div><div class="task-meta">' + meta.join('') + '</div>' + note + '</div>' +
    (isOwner() ? '<div class="task-side"><button class="icon-btn" data-act="menuItem" data-kind="' + x.kind + '" data-id="' + esc(x.id) + '" aria-label="Menu">' + ic('ellipsis-vertical') + '</button></div>' : '') + '</div>';
}
function kosong(ikon, judul, teks, tombol) {
  return '<div class="empty">' + ic(ikon) + '<b>' + esc(judul) + '</b><div class="small">' + teks + '</div>' + (tombol || '') + '</div>';
}
function ikonProjek(n) {
  n = String(n).toLowerCase();
  if (/wisuda|yudisium/.test(n)) return 'graduation-cap';
  if (/sembako|bagi|sosial|bakti|donasi/.test(n)) return 'hand-heart';
  if (/pmb|sosialisasi|promosi|kampanye|pendaftaran/.test(n)) return 'megaphone';
  if (/kuliah|seminar|kajian|workshop|pelatihan/.test(n)) return 'presentation';
  if (/lomba|festival|dies|perayaan/.test(n)) return 'party-popper';
  return 'rocket';
}
function gradProjek(p) { let h = 0; String(p.ProjekID + p.NamaProjek).split('').forEach(c => { h = (h * 7 + c.charCodeAt(0)) % 97; }); return p.Status === 'Selesai' ? 'pg4' : 'pg' + (1 + (h % 5)); }
function hMinus(tgl) { const n = diffHari(today(), tgl); return n === 0 ? 'Hari-H' : n === 1 ? 'H-1 (Besok)' : n > 0 ? 'H-' + n : 'Lewat ' + Math.abs(n) + ' hari'; }

/* ---------- Aksi umum item ---------- */
Aksi.toggle = el => {
  if (!isOwner()) { openLogin(); return; }
  const id = el.dataset.id;
  const rec0 = el.dataset.kind === 'ctn' ? S.ctn.get(id) : S.tgs.get(id);
  if (rec0) { lengket(id + ':ikut', true); lengket(id + ':sp', rec0.SelesaiPada || ''); }
  if (el.dataset.kind === 'ctn') {
    const c = S.ctn.get(id); if (!c) return;
    const done = c.Status === 'Selesai', baru = done ? (c._sebelum || 'Belum') : 'Selesai';
    el.classList.toggle('on', !done); el.classList.toggle('ok', !done);
    Outbox.push('catatan.status', { ID: id, Status: baru });
    if (!done) toast('Ditandai selesai 🎉', 'ok', { sub: c.Judul, aksi: 'Batalkan', fn: () => Outbox.push('catatan.status', { ID: Outbox.idMap[id] || id, Status: c.Status }) });
  } else {
    const t = S.tgs.get(id); if (!t) return;
    const done = t.Status === 'Selesai';
    el.classList.toggle('on', !done); el.classList.toggle('ok', !done);
    Outbox.push('tugas.status', { TugasID: id, Status: done ? 'Belum' : 'Selesai' });
    if (!done) toast('Tugas projek selesai', 'ok', { sub: t.NamaTugas, aksi: 'Batalkan', fn: () => Outbox.push('tugas.status', { TugasID: Outbox.idMap[id] || id, Status: 'Belum' }) });
  }
};
Aksi.buka = el => {
  const id = el.dataset.id;
  if (el.dataset.kind === 'tgs') { const t = S.tgs.get(id); if (t) go('#/projek/' + t.ProjekID); return; }
  if (isOwner()) go('#/catatan/ubah/' + id); else lihatCatatan(id);
};
Aksi.menuItem = el => {
  const id = el.dataset.id, kind = el.dataset.kind;
  if (kind === 'ctn') {
    const c = S.ctn.get(id); if (!c) return;
    menuPop(el, [
      { label: 'Ubah catatan', ikon: 'pencil', fn: () => go('#/catatan/ubah/' + id) },
      { label: c.Status === 'Selesai' ? 'Batalkan selesai' : 'Tandai selesai', ikon: 'circle-check', fn: () => Aksi.toggle({ dataset: { kind, id }, classList: { toggle() { } } }) },
      c.Status !== 'Sedang Dikerjakan' && c.Status !== 'Selesai' ? { label: 'Tandai sedang dikerjakan', ikon: 'hourglass', fn: () => Outbox.push('catatan.status', { ID: id, Status: 'Sedang Dikerjakan' }) } : null,
      { label: 'Duplikat ke besok', ikon: 'copy', fn: () => { const n = Object.assign({}, pick(c, CTN_F), { ID: tmpId(), Status: 'Belum', Tenggat: addDays(c.Tenggat.slice(0, 10), 1) + ' ' + jam(c.Tenggat) }); Outbox.push('catatan.save', n); toast('Catatan diduplikat ke besok', 'ok'); } },
      { label: 'Hapus', ikon: 'trash-2', bahaya: true, fn: () => hapusCatatan(id) }
    ]);
  } else {
    const t = S.tgs.get(id); if (!t) return;
    menuPop(el, [
      { label: 'Ubah tugas', ikon: 'pencil', fn: () => formTugas(t.ProjekID, t) },
      { label: 'Buka projek', ikon: 'folder-open', fn: () => go('#/projek/' + t.ProjekID) },
      { label: 'Hapus tugas', ikon: 'trash-2', bahaya: true, fn: () => hapusTugas(id) }
    ]);
  }
};
async function hapusCatatan(id, lalu) {
  const c = S.ctn.get(id); if (!c) return;
  if (!(await konfirmasi({ judul: 'Hapus catatan ini?', teks: '<b>' + esc(c.Judul) + '</b><br>Event & pengingat di Google Kalender ponsel ikut dihapus permanen.', ok: 'Hapus', bahaya: true }))) return;
  Outbox.push('catatan.delete', { ID: id });
  toast('Catatan dihapus', 'ok', { sub: c.Judul });
  lalu && lalu();
}
async function hapusTugas(id) {
  const t = S.tgs.get(id); if (!t) return;
  if (!(await konfirmasi({ judul: 'Hapus tugas projek?', teks: '<b>' + esc(t.NamaTugas) + '</b> beserta event kalendernya akan dihapus.', ok: 'Hapus', bahaya: true }))) return;
  Outbox.push('tugas.delete', { TugasID: id });
  toast('Tugas dihapus', 'ok');
}
function lihatCatatan(id) {
  const c = S.ctn.get(id); if (!c) return;
  const p = c.ProjekID ? S.prj.get(c.ProjekID) : null, telat = isTelat(c);
  modal({
    judul: c.Judul, kick: 'Catatan ' + esc(c.ID),
    isi: '<div class="row wrap mb">' + katChip(c.Kategori) + prioPill(c.Prioritas) + statusBadge(c.Status, telat) + '</div>' +
      '<dl class="kv"><dt>Tenggat</dt><dd>' + fmtTgl(c.Tenggat, { hari: true, jam: true }) + '</dd>' +
      (c.TanggalHariPenting ? '<dt>Hari penting</dt><dd>' + fmtTgl(c.TanggalHariPenting, { hari: true }) + '</dd>' : '') +
      (p ? '<dt>Projek</dt><dd>' + esc(p.NamaProjek) + '</dd>' : '') +
      (c.SelesaiPada ? '<dt>Selesai pada</dt><dd>' + fmtTgl(c.SelesaiPada, { jam: true }) + '</dd>' : '') + '</dl>' +
      (c.CatatanTambahan ? '<div class="ctn-note mt" style="background:var(--bg);border-radius:14px;padding:14px;white-space:pre-line">' + esc(c.CatatanTambahan) + '</div>' : '') +
      '<div class="mt">' + syncTag(c) + '</div>'
  });
}

/* =====================================================================
   BERANDA — dua kolom ceklis: Tugas Harianku | Tugas Event
   ===================================================================== */
/** Pekerjaan "hari ini": bertenggat hari ini, terlambat & belum selesai, atau diselesaikan hari ini.
 *  Item yang sudah dicentang tetap tampil (hijau) agar terlihat apa saja yang sudah dikerjakan. */
function untukHariIni(x, td) {
  const tgl = String(x.tenggat || '').slice(0, 10), done = x.status === 'Selesai';
  if (nilaiLengket(x.id + ':ikut', false)) return true;
  if (tgl === td) return true;
  if (done) return String(x.rec.SelesaiPada || '').slice(0, 10) === td;
  if (tgl) return tgl < td;
  return x.kind === 'tgs' && !!x.projek && x.projek.Status !== 'Selesai';   // tugas event tanpa tenggat
}
function colHead(judul, sub, ikon, warna, s, n) {
  const penuh = n > 0 && s === n;
  return '<div class="col-head"><span class="ci ' + warna + '">' + ic(ikon) + '</span><div class="ct"><h2 class="h3">' + judul + '</h2><small>' + sub + '</small></div>' +
    '<span class="col-prog' + (penuh ? ' full' : '') + '" title="' + s + ' dari ' + n + ' selesai"><span class="bar" style="--bc:' + (penuh ? '#16A34A' : 'var(--primary)') + '"><i style="width:' + pct(s, n) + '%"></i></span>' + s + '/' + n + ' selesai</span></div>';
}
function kpiCard(lbl, val, sub, ikon, warna, href, gaya) {
  return '<a class="card kpi hov" href="' + href + '"><div class="k-top"><span class="k-lbl">' + lbl + '</span><span class="k-ic ' + warna + '">' + ic(ikon) + '</span></div><div class="k-val num" style="' + (gaya || '') + '">' + val + '</div><div class="k-sub">' + sub + '</div></a>';
}
/** Filter tanggal kolom Beranda: '' = hari ini (tidak disimpan, kembali ke hari ini saat dibuka ulang). */
S.bf = S.bf || { h: '', e: '' };
function tglCtl(c) {
  return '<div class="tgl-f"><button type="button" class="icon-btn sq" data-act="bTgl" data-c="' + c + '" data-n="-1" aria-label="Tanggal sebelumnya">' + ic('chevron-left', 'sm') + '</button>' +
    '<input type="date" class="in sm" data-btgl="' + c + '" aria-label="Pilih tanggal"><button type="button" class="icon-btn sq" data-act="bTgl" data-c="' + c + '" data-n="1" aria-label="Tanggal berikutnya">' + ic('chevron-right', 'sm') + '</button>' +
    '<span class="tgl-ket" data-bket="' + c + '"></span></div>';
}
function setTglCtl(el, c, d, td) {
  const inp = el.querySelector('[data-btgl="' + c + '"]'); if (inp && inp.value !== d && document.activeElement !== inp) inp.value = d;
  const k = el.querySelector('[data-bket="' + c + '"]'), h = d === td ? '<span class="badge b-run">Hari ini</span>' : '<span class="badge b-idle">' + relHari(d) + '</span><button type="button" class="link xs" data-act="bTgl" data-c="' + c + '" data-n="0">Kembali ke hari ini</button>';
  if (k && k._h !== h) { k.innerHTML = h; k._h = h; }
}
function muatTgl(d) { if (d && S.dari && d < S.dari) pastikanRentang(d, d); }
Aksi.bTgl = el => { const c = el.dataset.c, n = +el.dataset.n, td = today(); const d = n === 0 ? td : addDays(S.bf[c] || td, n); S.bf[c] = d === td ? '' : d; muatTgl(d); emit(); };
function jamCepat(tgl) { let tg = tgl + ' ' + (S.set.JAM_TUGAS_CEPAT || '16:00'); if (tg <= nowStr()) tg = tgl + ' 23:00'; return tg; }
page('beranda', {
  judul: 'Beranda',
  render(el) {
    if (!el._built) {
      el.innerHTML = '<div data-part="hero"></div><div class="kpi-row kpi-hero" data-part="kpi"></div>' +
        '<div class="duo"><div class="stack l" style="gap:var(--gut)"><section class="card" data-col="harian"><div data-part="hh"></div>' + tglCtl('h') + '<div class="tlist" data-part="hl"></div>' +
        '<form class="quick-add" data-qa><span class="muted">' + ic('circle-plus') + '</span><input name="q" maxlength="120" placeholder="Tambah tugas harian…" aria-label="Tambah tugas harian untuk hari ini" autocomplete="off"><button class="btn btn-primary sm">Tambah</button></form>' +
        '<div class="col-foot"><a class="link" href="#/catatan">Buka Catatan Harian ' + ic('arrow-right', 'sm') + '</a></div></section>' +
        '<section class="card" data-col="lalu" data-part="lalu"></section></div>' +
        '<section class="card" data-col="event"><div data-part="eh"></div>' + tglCtl('e') + '<div data-part="el"></div><div data-part="etn"></div>' +
        '<form class="quick-add" data-qe><select name="p" aria-label="Pilih event"></select><input name="n" maxlength="160" placeholder="Tambah tugas event…" aria-label="Tambah tugas event" autocomplete="off"><button class="btn btn-primary sm">Tambah</button></form>' +
        '<div class="col-foot" data-part="ef"></div></section></div>' +
        '<div class="sub-grid"><section class="card" data-part="hp"></section><section class="card" data-part="pj"></section></div><div data-part="tips"></div>';
      el._built = 1;
      el.querySelectorAll('[data-btgl]').forEach(i => i.addEventListener('change', () => { const td = today(), v = i.value || td; S.bf[i.dataset.btgl] = v === td ? '' : v; muatTgl(v); emit(); }));
      const tgTambah = d => (d === today() ? jamCepat(d) : d + ' ' + (S.set.JAM_TUGAS_CEPAT || '16:00'));
      el.querySelector('[data-qa]').onsubmit = e => {
        e.preventDefault();
        const inp = e.target.q, judul = inp.value.trim();
        if (!judul) { inp.focus(); return; }
        const tg = tgTambah(S.bf.h || today());
        Outbox.push('catatan.save', { ID: tmpId(), Judul: judul, Kategori: (kategoriList().find(k => k.nama === 'Lainnya') || kategoriList()[0]).nama, Tenggat: tg, TanggalHariPenting: '', Prioritas: 'Biasa', Status: 'Belum', CatatanTambahan: '', ProjekID: '' });
        inp.value = ''; toast('Tugas harian ditambahkan', 'ok', { sub: 'Tenggat ' + (tg.slice(0, 10) === today() ? '' : fmtTgl(tg, { pendek: true, tanpaTahun: true }) + ' ') + jam(tg) + ' WIB • tersinkron ke kalender' });
      };
      el.querySelector('[data-qe]').onsubmit = e => {
        e.preventDefault();
        const f = e.target, nama = f.n.value.trim(), pid = f.p.value;
        if (!pid) { toast('Buat event dulu di menu Projek / Event', 'info'); return; }
        if (!nama) { f.n.focus(); return; }
        S.ui.bPrj = pid; Store.set('ui', S.ui);
        Outbox.push('tugas.save', { TugasID: tmpId(), ProjekID: pid, NamaTugas: nama, Tenggat: tgTambah(S.bf.e || today()), Status: 'Belum' });
        f.n.value = ''; toast('Tugas event ditambahkan', 'ok', { sub: (S.prj.get(pid) || {}).NamaProjek || '' });
      };
    }
    const now = nowStr(), td = today(), owner = isOwner();
    const dH = S.bf.h || td, dE = S.bf.e || td, tglX = x => String(x.tenggat || '').slice(0, 10);
    const semua = semuaItem(), selesai = x => x.status === 'Selesai';
    /* Ringkasan hari ini (hero & KPI) — tidak terpengaruh filter tanggal */
    const harianHI = semua.filter(x => !isEventItem(x) && tglX(x) === td);
    const eventHI = semua.filter(x => isEventItem(x) && x.tenggat && untukHariIni(x, td));
    const sHI = harianHI.filter(selesai).length, sEI = eventHI.filter(selesai).length;
    /* Tugas Harianku: hanya tugas bertenggat pada tanggal terpilih (yang dicentang tetap tampil) */
    const harian = (dH === td ? harianHI : semua.filter(x => !isEventItem(x) && tglX(x) === dH)).sort(urutStabil);
    /* Belum selesai dari hari sebelumnya: lewat tenggat & belum dicentang — hilang dari Beranda begitu dicentang */
    const lalu = semua.filter(x => !isEventItem(x) && !selesai(x) && x.tenggat && tglX(x) < td && tglX(x) !== dH).sort(urutStabil);
    /* Tugas Event: hari ini = seperti sebelumnya; tanggal lain = bertenggat pada tanggal itu */
    const event = (dE === td ? eventHI : semua.filter(x => isEventItem(x) && tglX(x) === dE)).sort(urutStabil);
    const tanpa = semua.filter(x => x.kind === 'tgs' && !x.tenggat && x.projek && x.projek.Status !== 'Selesai' && (!selesai(x) || String(x.rec.SelesaiPada || '').slice(0, 10) === td || nilaiLengket(x.id + ':ikut', false))).sort(urutStabil);
    const sH = harian.filter(selesai).length, sE = event.filter(selesai).length;
    const items = itemGabungan();
    const telat = items.filter(x => x.status !== 'Selesai' && x.tenggat && x.tenggat < now).sort(byTenggat);
    const batas3 = addDays(td, 3) + ' 23:59';
    const tempo = items.filter(x => x.status !== 'Selesai' && x.tenggat >= now && x.tenggat <= batas3);
    const hp = hariPentingList(td, addDays(td, 90));
    const hp30 = hp.filter(x => x.tgl <= addDays(td, 30));
    const prjAktif = [...S.prj.values()].filter(p => p.Status !== 'Selesai').sort((a, b) => (a.TanggalAcara < b.TanggalAcara ? -1 : 1));
    const nama = S.set.NAMA_ADMIN || 'Admin';

    /* Hero & ringkasan (tampilan awal Beranda) — angka hari ini, tidak terpengaruh filter tanggal */
    const totalHI = harianHI.length + eventHI.length, selesaiHI = sHI + sEI, sisaHI = totalHI - selesaiHI;
    const persen = pct(selesaiHI, totalHI), target = +S.set.TARGET_PERSEN || 75, h1 = hp[0];
    part(el, 'hero', '<section class="hero"><div class="hero-txt"><div class="pills"><span class="pill">' + ic('calendar', 'sm') + fmtTgl(td, { hari: true }) + '</span>' +
      (owner ? '<span class="pill lav hide-m">' + ic('zap', 'sm') + 'Mode Pemilik Aktif</span>' : '<span class="pill hide-m">' + ic('eye', 'sm') + 'Mode Lihat Saja</span>') +
      '<span class="pill">' + (S.kal.aktif !== false && S.set.KALENDER_AKTIF !== 'TIDAK' ? '<i class="dot ok"></i>G-Calendar HP Terhubung' : '<i class="dot warn"></i>Kalender nonaktif') + '</span></div>' +
      '<h1>' + sapaan() + ', ' + esc(nama) + '! 👋</h1>' +
      '<p>Hari ini ada <b>' + totalHI + ' tugas</b>' + (totalHI ? ' (' + (sisaHI ? sisaHI + ' belum selesai' : 'semua sudah selesai 🎉') + ')' : '') + (telat.length ? ' dan <b style="color:var(--late)">' + telat.length + ' terlambat</b>' : '') + '. Semua jadwal dan pengingat otomatis tersinkron ke Google Kalender ponsel Anda.</p>' +
      '<div class="acts">' + (owner ? '<a class="btn btn-primary" href="#/catatan/baru">' + ic('square-pen') + '+ Tambah Catatan Baru</a><button class="btn btn-white" data-act="sinkronUlang">' + ic('refresh-cw') + 'Sinkron Ulang</button>'
        : '<button class="btn btn-primary" data-act="login">' + ic('lock') + 'Masuk Pemilik</button><a class="btn btn-white" href="#/laporan">' + ic('chart-column') + 'Lihat Laporan</a>') + '</div></div>' +
      '<div class="hero-art" aria-hidden="true">' + (h1 ? '<div class="float f1"><div class="fi" style="background:#EFE9FE;color:#7C3AED">' + ic('megaphone') + '</div><div>' + esc(h1.judul.length > 24 ? h1.judul.slice(0, 23) + '…' : h1.judul) + '<small style="color:#6B38D4">' + esc(relHari(h1.tgl)) + '</small></div></div>' : '') +
      '<div class="orb"><div class="in-orb"><div>' + ic('badge-check') + selesaiHI + ' / ' + totalHI + ' Rampung</div></div></div>' +
      (telat.length ? '<div class="float f2"><div class="fi" style="background:#FEE2E2;color:#DC2626">' + ic('bell-ring') + '</div><div>' + telat.length + ' Tugas Terlambat<small style="color:#DC2626">Segera tindak lanjuti</small></div></div>'
        : '<div class="float f2"><div class="fi" style="background:#DCFCE7;color:#16A34A">' + ic('party-popper') + '</div><div>Semua on track<small style="color:#16A34A">Tidak ada yang terlambat</small></div></div>') + '</div></section>');

    const onTrack = !telat.length && (persen >= target || !totalHI || sisaHI === totalHI && now.slice(11) < '12:00');
    part(el, 'kpi',
      '<div class="card kpi kpi-prog">' + ringSvg(persen, { size: 86, stroke: 9, sub: 'SELESAI', font: 20 }) + '<div style="min-width:0;flex:1"><span class="ontrack ' + (onTrack ? '' : 'no') + '">' + (onTrack ? 'On Track ' + ic('target', 'sm') : 'Perlu Fokus ' + ic('zap', 'sm')) + '</span><div class="h3" style="margin-top:6px">Progres Hari Ini</div><div class="muted small">' + selesaiHI + ' dari ' + totalHI + ' tugas telah selesai dikerjakan.</div><div class="bar" style="margin-top:8px"><i style="width:' + persen + '%"></i></div></div></div>' +
      kpiCard('Tugas Hari Ini', totalHI, sisaHI + ' tugas menunggu', 'list-checks', 'c-biru', '#/catatan') +
      kpiCard('Jatuh Tempo', tempo.length, 'Dalam 3 hari ke depan', 'clock', 'c-oranye', '#/catatan') +
      kpiCard('Terlambat', telat.length, telat.length ? '<span class="badge b-late">Perlu dicek!</span>' : 'Aman 👍', 'circle-alert', 'c-' + (telat.length ? 'pink' : 'hijau'), '#/catatan', telat.length ? 'color:var(--late)' : '') +
      kpiCard('Hari Penting', hp30.length, '30 hari ke depan', 'star', 'c-ungu', '#/kalender'));

    /* Kolom kiri: Tugas Harianku */
    part(el, 'hh', colHead('Tugas Harianku', 'Catatan kerja harian • ' + fmtTgl(dH, { hari: true, pendek: true, tanpaTahun: dH.slice(0, 4) === td.slice(0, 4) }), 'notebook-pen', 'c-biru', sH, harian.length));
    setTglCtl(el, 'h', dH, td);
    part(el, 'hl', harian.length ? harian.map(x => taskRow(x)).join('') : (dH === td ? kosong('party-popper', 'Belum ada tugas harian hari ini', owner ? 'Tulis tugas di kotak bawah ini.' : 'Pemilik belum menjadwalkan tugas harian.') : kosong('calendar', 'Tidak ada tugas harian pada tanggal ini', owner ? 'Tulis di kotak bawah untuk menambah tugas di tanggal ini.' : '')));
    el.querySelector('[data-qa]').hidden = !owner;
    el.querySelector('[data-qa] input').placeholder = dH === td ? 'Tambah tugas harian…' : 'Tambah tugas untuk ' + fmtTgl(dH, { pendek: true, tanpaTahun: true }) + '…';

    /* Di bawah Tugas Harianku: belum selesai dari hari sebelumnya */
    part(el, 'lalu', '<div class="col-head"><span class="ci c-pink">' + ic('alarm-clock') + '</span><div class="ct"><h2 class="h3">Belum Selesai dari Hari Sebelumnya</h2><small>Lewat tenggat — setelah dicentang, hilang dari Beranda</small></div><span class="badge ' + (lalu.length ? 'b-late' : 'b-ok') + '">' + lalu.length + ' tugas</span></div>' +
      (lalu.length ? '<div class="tlist">' + lalu.map(x => taskRow(x, { tanggal: true })).join('') + '</div>' : '<div class="day-empty">Tidak ada tugas tertunda dari hari sebelumnya 👍</div>'));

    /* Kolom kanan: Tugas Event (dikelompokkan per event) */
    const grup = new Map();
    event.forEach(x => { const pid = x.projek.ProjekID; if (!grup.has(pid)) grup.set(pid, []); grup.get(pid).push(x); });
    const pids = [...grup.keys()].sort((a, b) => (String(S.prj.get(a).TanggalAcara) < String(S.prj.get(b).TanggalAcara) ? -1 : 1));
    part(el, 'eh', colHead('Tugas Event', 'Checklist projek & event kampus' + (dE === td ? '' : ' • ' + fmtTgl(dE, { hari: true, pendek: true, tanpaTahun: dE.slice(0, 4) === td.slice(0, 4) })), 'folder-open', 'c-ungu', sE, event.length));
    setTglCtl(el, 'e', dE, td);
    part(el, 'el', pids.length ? pids.map(pid => {
      const p = S.prj.get(pid), g = progres(pid), n = diffHari(td, p.TanggalAcara);
      return '<div class="ev-group"><div class="ev-head">' + ic(ikonProjek(p.NamaProjek), 'sm') + '<a href="#/projek/' + esc(pid) + '">' + esc(p.NamaProjek) + '</a>' +
        (p.Status !== 'Selesai' ? '<span class="badge ' + (n >= 0 && n <= 1 ? 'b-late' : 'b-lav') + '">' + hMinus(p.TanggalAcara) + '</span>' : '<span class="badge b-ok">Selesai</span>') +
        '<span class="sisa">' + g.selesai + '/' + g.total + ' checklist</span></div><div class="tlist">' + grup.get(pid).map(x => taskRow(x, { tanpaProjek: true })).join('') + '</div></div>';
    }).join('') : dE !== td ? kosong('calendar', 'Tidak ada tugas event pada tanggal ini', '') : kosong('rocket', 'Tidak ada tugas event hari ini', prjAktif.length ? 'Tugas event bertenggat hari ini akan muncul di sini.' : (owner ? 'Buat event dulu, lalu tambahkan checklist tugasnya.' : 'Belum ada event berjalan.'), owner && !prjAktif.length ? '<button class="btn btn-soft sm mt" data-act="projekBaru">' + ic('plus', 'sm') + 'Buat Event</button>' : ''));
    part(el, 'etn', tanpa.length ? '<div class="sub-sec"><div class="ev-head">' + ic('clock', 'sm') + '<span>Tanpa tenggat</span><span class="sisa">' + tanpa.filter(selesai).length + '/' + tanpa.length + ' selesai</span></div><div class="tlist">' + tanpa.map(x => taskRow(x)).join('') + '</div></div>' : '');
    const qe = el.querySelector('[data-qe]'), sel = qe.querySelector('select');
    qe.querySelector('[name="n"]').placeholder = dE === td ? 'Tambah tugas event…' : 'Tugas event untuk ' + fmtTgl(dE, { pendek: true, tanpaTahun: true }) + '…';
    const opsi = prjAktif.map(p => '<option value="' + esc(p.ProjekID) + '">' + esc(p.NamaProjek) + '</option>').join('');
    if (sel._h !== opsi) { const v = sel.value || S.ui.bPrj; sel.innerHTML = opsi; sel._h = opsi; if (v && prjAktif.some(p => p.ProjekID === v)) sel.value = v; }
    qe.hidden = !owner || !prjAktif.length;
    const lain = prjAktif.filter(p => !grup.has(p.ProjekID)).length;
    part(el, 'ef', '<a class="link" href="#/projek">Lihat semua event ' + ic('arrow-right', 'sm') + '</a>' + (lain && pids.length ? '<span class="xs muted">' + lain + ' event lain belum ada tugas ' + (dE === td ? 'hari ini' : 'di tanggal ini') + '</span>' : ''));

    part(el, 'hp', '<div class="card-head"><div class="ttl">' + ic('calendar-clock') + '<h2 class="h3">Hari Penting Terdekat</h2></div><a class="link xs" href="#/kalender">Kalender ' + ic('arrow-right', 'sm') + '</a></div>' +
      (hp.length ? hp.slice(0, 3).map(h => { const n = diffHari(td, h.tgl); return '<div class="hp"><div class="datebox ' + (n <= 1 ? '' : 'soft') + '"><b>' + +h.tgl.slice(8, 10) + '</b><small>' + BLN[+h.tgl.slice(5, 7) - 1].toUpperCase() + '</small></div><div style="min-width:0;flex:1"><div class="row" style="gap:6px"><div class="hp-t" style="flex:1;min-width:0">' + esc(h.judul) + '</div>' + (h.jenis === 'projek' ? ic('flag', 'sm') : ic('star', 'sm')) + '</div><div class="hp-s">' + (n === 0 ? '<b style="color:var(--late)">Hari ini!</b>' : n === 1 ? '<b style="color:var(--late)">Besok (H-1)</b>' : n + ' hari lagi') + (h.sub ? ' • ' + esc(h.sub) : '') + '</div></div></div>'; }).join('')
        : kosong('calendar-check', 'Belum ada hari penting', 'Isi "Hari Penting" di form lengkap catatan.')));

    part(el, 'pj', '<div class="card-head"><div class="ttl">' + ic('folder-open') + '<h2 class="h3">Event Berjalan</h2></div>' + (owner ? '<button class="icon-btn sq" data-act="projekBaru" aria-label="Event baru">' + ic('plus') + '</button>' : '') + '</div>' +
      (prjAktif.length ? prjAktif.slice(0, 3).map(p => { const g = progres(p.ProjekID); return '<a class="prj-mini" href="#/projek/' + esc(p.ProjekID) + '" style="display:block;color:inherit"><div class="row between top"><b style="font-size:13.5px;line-height:1.35">' + esc(p.NamaProjek) + '</b>' + (p.Status === 'Berjalan' ? '<span class="badge b-run">Berjalan</span>' : '<span class="badge b-warn">Persiapan</span>') + '</div>' +
        '<div class="row between xs" style="margin:5px 0 6px"><span class="muted">Hari-H ' + fmtTgl(p.TanggalAcara, { pendek: true, tanpaTahun: true }) + ' (' + hMinus(p.TanggalAcara) + ')</span><b>' + g.selesai + '/' + g.total + '</b></div>' +
        '<div class="bar" style="--bc:' + (p.Status === 'Berjalan' ? 'var(--primary)' : '#F59E0B') + '"><i style="width:' + g.persen + '%"></i></div></a>'; }).join('')
        : kosong('rocket', 'Belum ada event berjalan', 'Event seperti Wisuda atau Bagi Sembako tampil di sini.')) +
      (prjAktif.length > 3 ? '<div style="margin-top:10px"><a class="link" href="#/projek">+' + (prjAktif.length - 3) + ' event lain ' + ic('arrow-right', 'sm') + '</a></div>' : ''));

    const tips = ['Rilis flayer sebelum pukul 11:00 WIB untuk impresi tertinggi di beranda Instagram mahasiswa.', 'Jadwalkan konten hari penting minimal H-3 agar ada waktu revisi dari pimpinan.', 'Gunakan kategori yang konsisten agar laporan bulanan rapi saat ditunjukkan ke atasan.', 'Centang tugas segera setelah selesai — semuanya tercatat otomatis di menu Laporan.', 'Bagikan link laporan ke atasan: mereka bisa melihat tanpa bisa mengubah data.'];
    part(el, 'tips', '<div class="tips"><div class="ti">' + ic('lightbulb') + '</div><div class="small" style="flex:1"><b>Tips:</b> ' + tips[+td.slice(8, 10) % tips.length] + '</div><a class="link" href="#/laporan">Laporan</a></div>');
  }
});
Aksi.login = () => openLogin();
Aksi.projekBaru = () => formProjek();

/* =====================================================================
   CATATAN HARIAN — isi cepat + daftar ceklis per tanggal (simpel)
   ===================================================================== */
function grupBy(list, kunci) { const m = new Map(); list.forEach(x => { const k = kunci(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return m; }
function labelHari(d, td) {
  const n = diffHari(td, d), nama = fmtTgl(d, { hari: true, pendek: true, tanpaTahun: d.slice(0, 4) === td.slice(0, 4) });
  return n === 0 ? 'Hari ini · ' + nama : n === 1 ? 'Besok · ' + nama : n === -1 ? 'Kemarin · ' + nama : nama;
}
const LIM_RIWAYAT = 60;
page('catatan', {
  judul: 'Catatan Harian',
  render(el, sub, arg) {
    if (sub === 'baru' || sub === 'ubah') return Pages.catatanForm.render(el, sub, arg, S.route.args[2]);
    const owner = isOwner(), sig = kategoriList().map(k => k.nama).join('|') + owner;
    el._statis = false;
    if (el._sig !== sig || el._mode !== 'list') {
      el._mode = 'list'; el._sig = sig;
      const f = S.ui.cf, td = today();
      el.innerHTML = '<div class="page-head"><div><h1 class="h1">Catatan Harian</h1><p class="lead">Tulis pekerjaanmu, lalu centang bila sudah selesai. Pekerjaan yang sudah dicentang tetap tampil di daftar.</p></div>' +
        (owner ? '<div class="acts"><a class="btn btn-white sm" href="#/catatan/baru">' + ic('square-pen', 'sm') + 'Form lengkap</a></div>' : '') + '</div>' +
        (owner ? '<form class="card ctn-quick" data-cq novalidate autocomplete="off"><input class="in" name="j" maxlength="120" placeholder="Apa yang mau dikerjakan? Contoh: Desain story IG info beasiswa" aria-label="Pekerjaan">' +
          '<div class="cq-row"><label class="cq-f"><span>Tanggal</span><input type="date" class="in sm" name="t" value="' + td + '"></label>' +
          '<label class="cq-f"><span>Jam selesai</span><input type="time" class="in sm" name="h" value="' + esc(S.set.JAM_TUGAS_CEPAT || '16:00') + '"></label>' +
          '<label class="cq-f"><span>Kategori</span><select class="sel sm" name="k">' + kategoriList().map(k => '<option>' + esc(k.nama) + '</option>').join('') + '</select></label>' +
          '<button type="button" class="btn btn-white sm cq-star" data-pt aria-pressed="false">' + ic('star', 'sm') + 'Penting</button>' +
          '<button class="btn btn-primary sm cq-save">' + ic('plus', 'sm') + 'Simpan</button></div>' +
          '<div class="xs muted">Perlu catatan tambahan, hari penting, atau kaitkan ke event? Pakai <a href="#/catatan/baru">Form lengkap</a>.</div></form>' : '') +
        '<div class="ctn-bar"><div class="seg" data-part="tabs" role="tablist"></div><div class="search"><span>' + ic('search', 'sm') + '</span><input data-f="q" value="' + esc(f.q) + '" placeholder="Cari catatan…" aria-label="Cari catatan"></div>' +
        '<select class="sel sm" data-f="kat" aria-label="Kategori"><option value="">Semua kategori</option>' + kategoriList().map(k => '<option ' + (f.kat === k.nama ? 'selected' : '') + '>' + esc(k.nama) + '</option>').join('') + '</select>' +
        '<div class="tgl-f"><button type="button" class="icon-btn sq" data-act="cTgl" data-n="-1" aria-label="Tanggal sebelumnya">' + ic('chevron-left', 'sm') + '</button><input type="date" class="in sm" data-f="tgl" value="' + esc(f.tgl || '') + '" aria-label="Filter tanggal"><button type="button" class="icon-btn sq" data-act="cTgl" data-n="1" aria-label="Tanggal berikutnya">' + ic('chevron-right', 'sm') + '</button><button type="button" class="link xs" data-act="cTgl" data-n="x" data-ctglx>Semua tanggal</button></div></div>' +
        '<section class="card ctn-list" data-part="list"></section><div data-part="more"></div>';
      const upd = debounce(() => { Store.set('ui', S.ui); this.render(el); }, 180);
      el.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener(inp.tagName === 'INPUT' ? 'input' : 'change', () => { S.ui.cf[inp.dataset.f] = inp.value; S.ui.cLim = LIM_RIWAYAT; upd(); }));
      const cq = el.querySelector('[data-cq]');
      if (cq) {
        let penting = false, jamDisentuh = false;
        cq.h.addEventListener('input', () => { jamDisentuh = true; });
        const pt = cq.querySelector('[data-pt]');
        pt.onclick = () => { penting = !penting; pt.classList.toggle('on', penting); pt.setAttribute('aria-pressed', penting); };
        cq.onsubmit = e => {
          e.preventDefault();
          const judul = cq.j.value.trim();
          if (!judul) { cq.j.classList.add('bad'); cq.j.focus(); toast('Tulis dulu pekerjaannya', 'err'); return; }
          cq.j.classList.remove('bad');
          const tgl = cq.t.value || today();
          let tg = tgl + ' ' + (cq.h.value || S.set.JAM_TUGAS_CEPAT || '16:00');
          if (!jamDisentuh && tgl === today() && tg <= nowStr()) tg = tgl + ' 23:00';
          Outbox.push('catatan.save', { ID: tmpId(), Judul: judul, Kategori: cq.k.value, Tenggat: tg, TanggalHariPenting: '', Prioritas: penting ? 'Penting' : 'Biasa', Status: 'Belum', CatatanTambahan: '', ProjekID: '' });
          cq.j.value = ''; cq.j.focus();
          if (penting) pt.click();
          if (S.ui.cTab === 'riwayat') { S.ui.cTab = 'aktif'; Store.set('ui', S.ui); }
          toast('Catatan tersimpan', 'ok', { sub: fmtTgl(tg, { hari: true, pendek: true, jam: true }) });
        };
      }
    }
    const f = S.ui.cf, td = today(), q = (f.q || '').toLowerCase().trim();
    const cocok = c => (!q || (c.Judul + ' ' + (c.CatatanTambahan || '') + ' ' + c.ID).toLowerCase().indexOf(q) > -1) && (!f.kat || c.Kategori === f.kat);
    const semua = semuaCatatan().filter(cocok).map(itemCtn);
    const tab = S.ui.cTab === 'riwayat' ? 'riwayat' : 'aktif';
    /* Daftar Kerja: hari ini & mendatang (termasuk yang sudah dicentang) + yang terlambat belum selesai + yang diselesaikan hari ini */
    let aktif = semua.filter(x => { const t = String(x.tenggat).slice(0, 10); if (t >= td || x.status !== 'Selesai') return true; return String(x.rec.SelesaiPada || '').slice(0, 10) === td || nilaiLengket(x.id + ':ikut', false); });
    let riwayat = semua.filter(x => x.status === 'Selesai' || (tab === 'riwayat' && nilaiLengket(x.id + ':ikut', false)));
    const tglF = /^\d{4}-\d{2}-\d{2}$/.test(f.tgl || '') ? f.tgl : '';
    const ci = el.querySelector('[data-f="tgl"]'); if (ci && ci.value !== tglF && document.activeElement !== ci) ci.value = tglF;
    const cx = el.querySelector('[data-ctglx]'); if (cx) cx.hidden = !tglF;
    if (tglF) muatTgl(tglF);
    const sp = x => String(nilaiLengket(x.id + ':sp', '') || x.rec.SelesaiPada || x.tenggat || '');
    if (tglF) { aktif = semua.filter(x => String(x.tenggat).slice(0, 10) === tglF); riwayat = riwayat.filter(x => sp(x).slice(0, 10) === tglF); }
    const nBelum = aktif.filter(x => x.status !== 'Selesai').length, nSelesai = tglF ? riwayat.filter(x => x.status === 'Selesai').length : semua.filter(x => x.status === 'Selesai').length;
    part(el, 'tabs', '<button role="tab" class="' + (tab === 'aktif' ? 'on' : '') + '" data-act="cTab" data-k="aktif">' + ic('list-checks', 'sm') + 'Daftar Kerja <span class="n">' + nBelum + ' belum</span></button>' +
      '<button role="tab" class="' + (tab === 'riwayat' ? 'on' : '') + '" data-act="cTab" data-k="riwayat">' + ic('circle-check', 'sm') + 'Sudah Dikerjakan <span class="n">' + nSelesai + '</span></button>');
    let html = '', more = '';
    if (tab === 'aktif') {
      const g = grupBy(aktif.sort(urutStabil), x => String(x.tenggat).slice(0, 10));
      const dKosong = tglF || td;
      if (!g.has(dKosong) && !q && !f.kat) g.set(dKosong, []);
      html = [...g.keys()].sort().map(d => {
        const xs = g.get(d), s = xs.filter(x => x.status === 'Selesai').length, lewat = d < td, adaBelum = s < xs.length;
        return '<div class="day-group"><div class="day-h' + (lewat && adaBelum ? ' late' : d === td ? ' today' : '') + '">' + ic(lewat && adaBelum ? 'alarm-clock' : 'calendar', 'sm') + '<span>' + labelHari(d, td) + '</span>' + (lewat && adaBelum ? '<span class="badge b-late">lewat tenggat</span>' : '') + (xs.length ? '<span class="n">' + s + '/' + xs.length + ' selesai</span>' : '') + '</div>' +
          (xs.length ? '<div class="tlist">' + xs.map(x => taskRow(x, { catatan: true })).join('') + '</div>' : '<div class="day-empty">' + (d === td ? 'Belum ada tugas untuk hari ini' : 'Tidak ada tugas pada tanggal ini') + (owner ? ' — tulis di kotak atas.' : '.') + '</div>') + '</div>';
      }).join('');
      if (!aktif.length && (q || f.kat)) html = kosong('search', 'Tidak ada yang cocok', 'Coba kata kunci, kategori, atau tanggal lain.');
    } else {
      const urut = riwayat.sort((a, b) => { const sa = sp(a), sb = sp(b); return sa < sb ? 1 : sa > sb ? -1 : a.id < b.id ? -1 : 1; });
      const lim = S.ui.cLim || LIM_RIWAYAT, potong = urut.slice(0, lim);
      const g = grupBy(potong, x => sp(x).slice(0, 10));
      html = potong.length ? [...g.keys()].map(d => '<div class="day-group"><div class="day-h">' + ic('circle-check', 'sm') + '<span>' + labelHari(d, td) + '</span><span class="n">' + g.get(d).length + ' dikerjakan</span></div><div class="tlist">' + g.get(d).map(x => taskRow(x, { catatan: true, tanggal: true })).join('') + '</div></div>').join('')
        : kosong(q || f.kat || tglF ? 'search' : 'circle-check', q || f.kat ? 'Tidak ada yang cocok' : tglF ? 'Belum ada pekerjaan selesai pada tanggal ini' : 'Belum ada pekerjaan yang dicentang', q || f.kat ? 'Coba kata kunci, kategori, atau tanggal lain.' : 'Centang pekerjaan di Daftar Kerja, nanti tercatat di sini.');
      more = '<div class="row wrap mt" style="justify-content:center;gap:10px">' + (urut.length > lim ? '<button class="btn btn-white sm" data-act="cMore">Tampilkan lebih banyak (' + (urut.length - lim) + ')</button>' : '') +
        (S.dari ? '<span class="xs muted">' + ic('history', 'sm') + ' Data sejak ' + fmtTgl(S._arsipDari || S.dari, { pendek: true }) + '</span><button class="link xs" data-act="muatLama">Muat 3 bulan sebelumnya</button>' : '') + '</div>';
    }
    part(el, 'list', html);
    part(el, 'more', more);
  }
});
Aksi.cTab = el => { S.ui.cTab = el.dataset.k; S.ui.cLim = LIM_RIWAYAT; Store.set('ui', S.ui); emit(); };
Aksi.cTgl = el => { const f = S.ui.cf, n = el.dataset.n; f.tgl = n === 'x' ? '' : addDays(f.tgl || today(), +n); S.ui.cLim = LIM_RIWAYAT; emit(); };
Aksi.cMore = () => { S.ui.cLim = (S.ui.cLim || LIM_RIWAYAT) + LIM_RIWAYAT; emit(); };
Aksi.muatLama = async el => {
  const basis = S._arsipDari || S.dari, dari = geserBulan(basis.slice(0, 7), -3) + '-01';
  setBusy(el, true, 'Memuat…');
  const ok = await pastikanRentang(dari, addDays(basis, -1));
  if (ok) S._arsipDari = dari;
  setBusy(el, false); emit();
};

/* =====================================================================
   FORM CATATAN — tambah / ubah (draf lokal otomatis)
   ===================================================================== */
const KAT_SUB = { Flayer: 'Poster & Feed', 'Konten Medsos': 'Reels, Story, TikTok', Rapat: 'Briefing Tim Kampus', Lainnya: 'Dokumen & Arsip' };
page('catatanForm', {
  statis: true,
  render(el, mode, id, prjArg) {
    if (!isOwner()) { lihatCatatan(id); go('#/catatan'); return; }
    el._mode = 'form'; el._sig = ''; el._statis = true;
    const ubah = mode === 'ubah', c0 = ubah ? S.ctn.get(id) : null;
    if (ubah && !c0) { el.innerHTML = '<div class="card mt-l">' + kosong('file-x', 'Catatan tidak ditemukan', 'Mungkin sudah dihapus.', '<a class="btn btn-soft mt" href="#/catatan">Kembali</a>') + '</div>'; return; }
    const kunciDraf = 'draf:' + (ubah ? id : 'baru');
    const draf = Store.get(kunciDraf, null);
    const td = today();
    let tglBaru = /^\d{4}-\d{2}-\d{2}$/.test(id || '') ? id : td;
    const v = Object.assign({ Judul: '', Kategori: kategoriList()[0].nama, Tenggat: tglBaru + ' ' + (S.set.JAM_TUGAS_CEPAT || '16:00'), TanggalHariPenting: '', Prioritas: 'Biasa', Status: 'Belum', CatatanTambahan: '', ProjekID: prjArg && S.prj.has(prjArg) ? prjArg : '' }, c0 || {}, draf && draf.v || {});
    const prjOpts = [...S.prj.values()].sort((a, b) => (a.TanggalAcara < b.TanggalAcara ? 1 : -1));
    const rem = (S.set.PENGINGAT_TUGAS || '1440,60').split(',').map(Number);
    const remTeks = m => (m % 1440 === 0 ? m / 1440 + ' Hari' : m % 60 === 0 ? m / 60 + ' Jam' : m + ' Menit') + ' Sebelum Tenggat';
    el.innerHTML = '<div class="row between wrap" style="margin-top:8px"><a class="link" href="#/catatan">' + ic('arrow-left', 'sm') + 'Kembali ke Catatan Harian</a>' +
      '<span class="pill">' + (S.set.KALENDER_AKTIF === 'TIDAK' ? '<i class="dot warn"></i>Kalender nonaktif' : '<i class="dot ok"></i>' + ic('calendar', 'sm') + 'Google Kalender: <b style="color:var(--primary)">Tersambung Otomatis</b>') + '</span></div>' +
      '<div class="page-head" style="margin-top:12px"><div><div class="row wrap"><h1 class="h1">' + (ubah ? 'Ubah Catatan Harian' : 'Tambah Catatan Harian Baru') + '</h1>' + (ubah ? '<span class="pill lav">' + ic('notebook-pen', 'sm') + 'Mode Edit: #' + esc(id) + '</span>' : '') + '</div>' +
      '<p class="lead">Isi detail tugas kerja harian. Tenggat waktu dan pengingat otomatis tersinkronisasi ke Google Kalender HP Anda.</p></div></div>' +
      (draf ? '<div class="info-box warn mb">' + ic('history') + '<div style="flex:1">Draf lokal dipulihkan (' + esc(draf.t) + ').</div><button class="link" data-buang>Buang draf</button></div>' : '') +
      '<form class="form-grid" novalidate><div class="stack l" style="gap:var(--gut)">' +
      '<section class="card"><div class="row between"><label class="t-md" for="f-judul">Judul Tugas / Catatan Kerja <span class="req">*</span></label><span class="xs muted">Maks. 120 karakter</span></div>' +
      '<input id="f-judul" class="in mt" name="Judul" maxlength="120" value="' + esc(v.Judul) + '" placeholder="Contoh: Flayer Pendaftaran Wisuda Gelombang II" autocomplete="off"><div class="row between" style="margin-top:8px"><span class="xs" style="color:#6B38D4">' + ic('circle-check', 'sm') + ' Judul jelas, spesifik, dan mudah dicari di daftar harian</span><span class="counter" data-cnt="Judul"></span></div><div class="err" data-err="Judul"></div></section>' +
      '<section class="card"><div class="row between wrap"><div><div class="t-md">Kategori Tugas Kampus</div><div class="small muted">Pilih label klasifikasi materi kerja harian Anda</div></div><span class="badge b-run">1 Kategori Dipilih</span></div>' +
      '<div class="cat-tiles mt" role="radiogroup">' + kategoriList().map(k => '<button type="button" role="radio" class="cat-tile c-' + k.warna + (v.Kategori === k.nama ? ' on' : '') + '" data-kat="' + esc(k.nama) + '" aria-checked="' + (v.Kategori === k.nama) + '"><span class="ci">' + ic(k.ikon || 'tag') + '</span><b>' + esc(k.nama) + '</b><small>' + esc(KAT_SUB[k.nama] || 'Kategori kustom') + '</small></button>').join('') + '</div></section>' +
      '<section class="card"><div class="t-md">Jadwal &amp; Tenggat Waktu</div><div class="small muted">Tentukan batas akhir penyelesaian tugas dan jadwal penayangan materi</div>' +
      '<div class="grid g2 mt"><div class="field"><label for="f-tgl">' + ic('calendar', 'sm') + 'Tanggal Tenggat <span class="req">*</span></label><input id="f-tgl" type="date" class="in" name="tgl" value="' + esc(v.Tenggat.slice(0, 10)) + '"></div>' +
      '<div class="field"><label for="f-jam">' + ic('clock', 'sm') + 'Jam Selesai / Siap Posting <span class="req">*</span></label><input id="f-jam" type="time" class="in" name="jam" value="' + esc(jam(v.Tenggat) || '16:00') + '"></div></div><div class="err" data-err="Tenggat"></div>' +
      '<div class="info-box lav mt" style="align-items:center;flex-wrap:wrap"><span class="k-ic" style="width:40px;height:40px;background:#fff;color:#6B38D4;border-radius:12px;display:grid;place-items:center">' + ic('calendar-check') + '</span><div style="flex:1;min-width:180px"><b>Hari Penting Kampus (Hari-H Acara)</b> ' + ic('star', 'sm') + '<div class="small muted">Opsional — terkait agenda besar universitas, diingatkan H-3 &amp; H-1</div></div><input type="date" class="in" style="width:auto;min-width:180px;background:#fff" name="TanggalHariPenting" value="' + esc(v.TanggalHariPenting) + '" aria-label="Tanggal hari penting"></div></section>' +
      '<section class="card"><div class="row between"><div class="t-md">Relasi Projek / Event Universitas</div><a class="link xs" href="#/projek">Kelola Projek</a></div>' +
      '<select class="sel mt" name="ProjekID"><option value="">— Tidak terkait projek —</option>' + prjOpts.map(p => '<option value="' + esc(p.ProjekID) + '" ' + (v.ProjekID === p.ProjekID ? 'selected' : '') + '>' + esc(p.NamaProjek) + ' (' + fmtTgl(p.TanggalAcara, { pendek: true }) + ')</option>').join('') + '</select>' +
      '<div class="info-box mt small" data-prjinfo>' + ic('info', 'sm') + '<span>Bila dipilih, catatan ini ikut tampil di detail projek dan rekap projek.</span></div></section>' +
      '<section class="card"><div class="row between"><label class="t-md" for="f-ct">Catatan Tambahan &amp; Arahan Teknis</label><span class="xs muted">Format Bebas</span></div>' +
      '<textarea id="f-ct" class="ta mt" name="CatatanTambahan" maxlength="2000" placeholder="Mis. ukuran flayer, teks yang harus dimasukkan, link aset…">' + esc(v.CatatanTambahan) + '</textarea><div class="counter" data-cnt="CatatanTambahan" style="margin-top:6px"></div></section></div>' +
      '<div class="stack l" style="gap:var(--gut)">' +
      '<section class="card"><div class="row between"><div class="t-md">Skala Prioritas</div><span class="badge b-idle">Sorotan</span></div><div class="seg sq full mt" data-seg="Prioritas">' + ['Penting', 'Biasa'].map(p => '<button type="button" class="' + (v.Prioritas === p ? 'on' : '') + '" data-v="' + p + '">' + (p === 'Penting' ? ic('star', 'sm') : '') + p + '</button>').join('') + '</div>' +
      '<div class="info-box mt small">' + ic('pin', 'sm') + '<span>Tugas <b>Penting</b> disematkan di ringkasan Beranda dan ditandai ikon bintang di Kalender Bulanan.</span></div></section>' +
      '<section class="card"><div class="row between"><div class="t-md">Status Pengerjaan</div><i class="dot"></i></div><div class="seg sq full mt" data-seg="Status">' + [['Belum', 'Belum'], ['Sedang Dikerjakan', 'Dikerjakan'], ['Selesai', 'Selesai']].map(([s, l]) => '<button type="button" class="' + (v.Status === s ? 'on' : '') + '" data-v="' + s + '">' + l + '</button>').join('') + '</div></section>' +
      '<section class="card" style="background:linear-gradient(180deg,#F6F8FF,#fff)"><div class="row">' + '<span class="k-ic" style="width:44px;height:44px;border-radius:14px;background:#fff;color:var(--primary);display:grid;place-items:center;box-shadow:var(--sh1)">' + ic('bell-ring') + '</span><div><div class="t-md">Pengingat Google Kalender</div><div class="xs" style="color:var(--primary);font-weight:700">● Sinkronisasi Aktif ke HP</div></div></div>' +
      '<p class="small muted">Notifikasi jadwal dikirim langsung ke kalender smartphone agar tidak terlewat:</p><div class="stack s">' +
      rem.map(m => '<div class="rem-item">' + ic('square-check') + '<div><b class="small">' + remTeks(m) + '</b><div class="xs muted">Notifikasi pop-up di aplikasi Google Kalender</div></div></div>').join('') +
      '<div class="rem-item">' + ic('square-check') + '<div><b class="small">Notifikasi Hari-H Kampus</b><div class="xs muted">Pengingat H-' + (S.set.PENGINGAT_HARI_PENTING || '3,1').split(',').join(' & H-') + ' pukul ' + esc(S.set.JAM_PENGINGAT || '09:00') + '</div></div></div></div>' +
      '<div class="xs muted mt">' + ic('info', 'sm') + ' Atur jam pengingat di menu Pengaturan.</div></section>' +
      (ubah ? '<section class="card danger-zone"><div class="xs b" style="letter-spacing:.06em;color:var(--text-2)">ZONA PERUBAHAN DATA</div><div class="info-box bad mt">' + ic('triangle-alert') + '<div><b>Hapus Catatan Harian Ini?</b><div class="small">Menghapus catatan juga menghapus agenda pengingat dari Google Kalender ponsel Anda secara permanen.</div></div></div><div style="text-align:right" class="mt"><button type="button" class="btn btn-danger sm" data-hapus>' + ic('trash-2', 'sm') + 'Hapus Catatan Ini…</button></div></section>' : '') +
      '</div></form>' +
      '<div class="savebar"><span class="draft" data-draft>' + ic('cloud', 'sm') + (ubah ? 'Perubahan disimpan saat menekan Simpan' : 'Draf lokal tersimpan otomatis') + '</span><a class="btn btn-white" href="#/catatan">Batal / Kembali</a><button class="btn btn-primary" data-simpan>' + ic('circle-check') + 'Simpan Catatan &amp; Sinkronkan ke Kalender</button></div>';

    const form = el.querySelector('form');
    const st = { Kategori: v.Kategori, Prioritas: v.Prioritas, Status: v.Status };
    const cnt = () => { el.querySelector('[data-cnt="Judul"]').textContent = form.Judul.value.length + ' / 120'; el.querySelector('[data-cnt="CatatanTambahan"]').textContent = form.CatatanTambahan.value.length + ' karakter'; };
    const kumpul = () => ({ Judul: form.Judul.value.trim(), Kategori: st.Kategori, Tenggat: form.tgl.value && form.jam.value ? form.tgl.value + ' ' + form.jam.value : '', TanggalHariPenting: form.TanggalHariPenting.value, Prioritas: st.Prioritas, Status: st.Status, CatatanTambahan: form.CatatanTambahan.value.trim(), ProjekID: form.ProjekID.value });
    const simpanDraf = debounce(() => { Store.set(kunciDraf, { t: nowStr().slice(11) + ' WIB', v: kumpul() }); const d = el.querySelector('[data-draft]'); if (d) d.innerHTML = ic('cloud-check', 'sm') + 'Draf lokal tersimpan otomatis pukul ' + nowStr().slice(11) + ' WIB'; }, 500);
    cnt();
    form.addEventListener('input', () => { cnt(); simpanDraf(); });
    form.addEventListener('change', simpanDraf);
    el.querySelectorAll('[data-kat]').forEach(b => b.onclick = () => { st.Kategori = b.dataset.kat; el.querySelectorAll('[data-kat]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); simpanDraf(); });
    el.querySelectorAll('[data-seg]').forEach(sg => sg.onclick = e => { const b = e.target.closest('button'); if (!b) return; st[sg.dataset.seg] = b.dataset.v; sg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); simpanDraf(); });
    const buang = el.querySelector('[data-buang]'); if (buang) buang.onclick = () => { Store.del(kunciDraf); route(); };
    const hapus = el.querySelector('[data-hapus]'); if (hapus) hapus.onclick = () => hapusCatatan(id, () => { Store.del(kunciDraf); go('#/catatan'); });
    const simpan = () => {
      const d = kumpul(); let ok = true;
      el.querySelectorAll('[data-err]').forEach(x => { x.textContent = ''; });
      form.Judul.classList.remove('bad');
      if (!d.Judul) { el.querySelector('[data-err="Judul"]').textContent = 'Judul wajib diisi — tulis singkat apa yang harus dikerjakan.'; form.Judul.classList.add('bad'); ok = false; }
      if (!d.Tenggat) { el.querySelector('[data-err="Tenggat"]').textContent = 'Tanggal dan jam tenggat wajib diisi.'; ok = false; }
      if (!ok) { (form.querySelector('.bad') || form.tgl).focus(); toast('Lengkapi isian yang ditandai', 'err'); return; }
      Outbox.push('catatan.save', Object.assign({ ID: ubah ? id : tmpId() }, d));
      Store.del(kunciDraf);
      toast(ubah ? 'Perubahan tersimpan' : 'Catatan tersimpan', 'ok', { sub: S.set.KALENDER_AKTIF === 'TIDAK' ? '' : 'Disinkronkan ke Google Kalender di latar belakang.' });
      const balik = S._prevHash && !/#\/catatan\/(baru|ubah)/.test(S._prevHash) ? S._prevHash : '#/catatan';
      go(balik);
    };
    el.querySelector('[data-simpan]').onclick = simpan;
    form.onsubmit = e => { e.preventDefault(); simpan(); };
    if (!ubah) setTimeout(() => form.Judul.focus(), 60);
  }
});

/* =====================================================================
   PROJEK / EVENT — kartu, detail, form
   ===================================================================== */
function formProjek(p0) {
  if (!isOwner()) { openLogin(); return; }
  const p = Object.assign({ ProjekID: '', NamaProjek: '', TanggalMulai: today(), TanggalAcara: addDays(today(), 14), JamAcara: '', Lokasi: '', Penyelenggara: '', Status: 'Persiapan', Deskripsi: '' }, p0 || {});
  const m = modal({
    judul: p0 ? 'Ubah Projek / Event' : 'Rencanakan Projek Baru', kick: ic('folder-open', 'sm') + ' Projek & Event Kampus', wide: true,
    isi: '<form class="stack" novalidate><div class="field"><label>Nama projek / event <span class="req">*</span></label><input class="in" name="NamaProjek" maxlength="120" value="' + esc(p.NamaProjek) + '" placeholder="Contoh: Wisuda Sarjana & Magister Ke-104" autofocus><div class="err" data-e="nama"></div></div>' +
      '<div class="grid g3"><div class="field"><label>Mulai persiapan</label><input type="date" class="in" name="TanggalMulai" value="' + esc(p.TanggalMulai) + '"></div><div class="field"><label>Hari-H acara <span class="req">*</span></label><input type="date" class="in" name="TanggalAcara" value="' + esc(p.TanggalAcara) + '"><div class="err" data-e="tgl"></div></div>' +
      '<div class="field"><label>Jam acara</label><input class="in" name="JamAcara" value="' + esc(p.JamAcara) + '" placeholder="08:00-13:00"><div class="hint">Kosongkan bila seharian</div><div class="err" data-e="jam"></div></div></div>' +
      '<div class="grid g2"><div class="field"><label>Lokasi</label><input class="in" name="Lokasi" maxlength="120" value="' + esc(p.Lokasi) + '" placeholder="Auditorium Utama Kampus"></div><div class="field"><label>Penyelenggara</label><input class="in" name="Penyelenggara" maxlength="120" value="' + esc(p.Penyelenggara) + '" placeholder="Biro Kemahasiswaan & Humas"></div></div>' +
      '<div class="field"><label>Status</label><div class="seg sq full" data-seg>' + ['Persiapan', 'Berjalan', 'Selesai'].map(s => '<button type="button" data-v="' + s + '" class="' + (p.Status === s ? 'on' : '') + '">' + s + '</button>').join('') + '</div></div>' +
      '<div class="field"><label>Deskripsi singkat</label><textarea class="ta" name="Deskripsi" maxlength="1000" placeholder="Publikasi medsos, live streaming, dokumentasi…">' + esc(p.Deskripsi) + '</textarea></div>' +
      '<div class="info-box small">' + ic('calendar-check', 'sm') + '<span>Hari-H otomatis masuk Google Kalender dengan pengingat H-3 &amp; H-1. Tugas projek bertenggat juga tersinkron.</span></div></form>',
    kaki: (p0 ? '<button class="btn btn-danger" data-del style="margin-right:auto">' + ic('trash-2', 'sm') + 'Hapus</button>' : '') + '<button class="btn btn-ghost" data-n>Batal</button><button class="btn btn-primary" data-y>' + ic('circle-check') + (p0 ? 'Simpan Perubahan' : 'Buat Projek') + '</button>'
  });
  const f = m.querySelector('form'); let status = p.Status;
  m.querySelector('[data-seg]').onclick = e => { const b = e.target.closest('button'); if (!b) return; status = b.dataset.v; m.querySelectorAll('[data-seg] button').forEach(x => x.classList.toggle('on', x === b)); };
  m.querySelector('[data-n]').onclick = () => m.close();
  if (p0) m.querySelector('[data-del]').onclick = async () => { m.close(); if (await konfirmasi({ judul: 'Hapus projek ini?', teks: '<b>' + esc(p0.NamaProjek) + '</b> beserta <b>' + tugasProjek(p0.ProjekID).length + ' tugas</b> dan event kalendernya akan dihapus. Catatan terkait tetap ada.', ok: 'Hapus projek', bahaya: true })) { Outbox.push('projek.delete', { ProjekID: p0.ProjekID }); toast('Projek dihapus', 'ok'); if (S.route.name === 'projek' && S.route.args[0]) go('#/projek'); } };
  const kirim = () => {
    const d = { ProjekID: p0 ? p0.ProjekID : tmpId(), NamaProjek: f.NamaProjek.value.trim(), TanggalMulai: f.TanggalMulai.value, TanggalAcara: f.TanggalAcara.value, JamAcara: f.JamAcara.value.replace(/\s/g, '').replace('–', '-'), Lokasi: f.Lokasi.value.trim(), Penyelenggara: f.Penyelenggara.value.trim(), Status: status, Deskripsi: f.Deskripsi.value.trim() };
    m.querySelectorAll('[data-e]').forEach(x => { x.textContent = ''; });
    let ok = true;
    if (!d.NamaProjek) { m.querySelector('[data-e="nama"]').textContent = 'Nama projek wajib diisi.'; ok = false; }
    if (!d.TanggalAcara) { m.querySelector('[data-e="tgl"]').textContent = 'Tanggal hari-H wajib diisi.'; ok = false; }
    if (d.JamAcara && !/^([01]\d|2[0-3]):[0-5]\d(-([01]\d|2[0-3]):[0-5]\d)?$/.test(d.JamAcara)) { m.querySelector('[data-e="jam"]').textContent = 'Format: 08:00 atau 08:00-13:00'; ok = false; }
    if (!ok) return;
    if (d.TanggalMulai && d.TanggalMulai > d.TanggalAcara) d.TanggalMulai = d.TanggalAcara;
    Outbox.push('projek.save', d);
    m.close(); toast(p0 ? 'Projek diperbarui' : 'Projek dibuat', 'ok', { sub: d.NamaProjek });
    if (!p0) go('#/projek/' + d.ProjekID);
  };
  m.querySelector('[data-y]').onclick = kirim;
  f.onsubmit = e => { e.preventDefault(); kirim(); };
}
function formTugas(pid, t0) {
  if (!isOwner()) { openLogin(); return; }
  const t = Object.assign({ NamaTugas: '', Tenggat: '', Status: 'Belum' }, t0 || {});
  const m = modal({
    judul: t0 ? 'Ubah Tugas Projek' : 'Tambah Tugas Projek',
    isi: '<form class="stack" novalidate><div class="field"><label>Nama tugas <span class="req">*</span></label><input class="in" name="NamaTugas" maxlength="160" value="' + esc(t.NamaTugas) + '" autofocus></div>' +
      '<div class="grid g2"><div class="field"><label>Tanggal tenggat</label><input type="date" class="in" name="tgl" value="' + esc(String(t.Tenggat).slice(0, 10)) + '"></div><div class="field"><label>Jam</label><input type="time" class="in" name="jam" value="' + esc(jam(t.Tenggat) || '17:00') + '"></div></div>' +
      '<label class="cbx"><input type="checkbox" name="sel" ' + (t.Status === 'Selesai' ? 'checked' : '') + '><div><b>Sudah selesai</b><small>Centang bila tugas ini sudah dikerjakan</small></div></label></form>',
    kaki: '<button class="btn btn-ghost" data-n>Batal</button><button class="btn btn-primary" data-y>Simpan</button>'
  });
  const f = m.querySelector('form');
  const kirim = () => {
    const nama = f.NamaTugas.value.trim(); if (!nama) { f.NamaTugas.classList.add('bad'); f.NamaTugas.focus(); return; }
    Outbox.push('tugas.save', { TugasID: t0 ? t0.TugasID : tmpId(), ProjekID: pid, NamaTugas: nama, Tenggat: f.tgl.value ? f.tgl.value + ' ' + (f.jam.value || '17:00') : '', Status: f.sel.checked ? 'Selesai' : 'Belum' });
    m.close(); toast(t0 ? 'Tugas diperbarui' : 'Tugas ditambahkan', 'ok');
  };
  m.querySelector('[data-n]').onclick = () => m.close();
  m.querySelector('[data-y]').onclick = kirim;
  f.onsubmit = e => { e.preventDefault(); kirim(); };
}
function prjCard(p) {
  const g = progres(p.ProjekID), tt = tugasProjek(p.ProjekID), owner = isOwner(), n = diffHari(today(), p.TanggalAcara);
  /* 3 checklist berikutnya; yang baru dicentang tetap di tempat sampai pindah halaman */
  const utama = tt.filter(t => t.Status !== 'Selesai' || nilaiLengket(t.TugasID + ':ikut', false)).slice(0, 3);
  const cl = utama.length < 3 ? tt.filter(t => t.Status === 'Selesai' && utama.indexOf(t) < 0).slice(-(3 - utama.length)).concat(utama).sort((a, b) => tt.indexOf(a) - tt.indexOf(b)) : utama;
  return '<article class="card prj-card hov"><div class="row between top"><div class="row wrap" style="gap:6px">' + projekBadge(p.Status) +
    (p.Status !== 'Selesai' ? '<span class="badge ' + (n <= 1 ? 'b-late' : 'b-run') + '">' + ic('alarm-clock') + (n === 1 ? 'Hari-H: Besok! (H-1)' : 'Hari-H: ' + hMinus(p.TanggalAcara)) + '</span>' : '') + '</div>' +
    (owner ? '<button class="icon-btn" data-act="menuPrj" data-id="' + esc(p.ProjekID) + '" aria-label="Menu projek">' + ic('ellipsis-vertical') + '</button>' : '') + '</div>' +
    '<h3 class="h3" style="font-size:17px;line-height:1.3"><a href="#/projek/' + esc(p.ProjekID) + '" style="color:inherit">' + esc(p.NamaProjek) + '</a></h3>' +
    '<div class="prj-banner ' + gradProjek(p) + '"><span class="big">' + ic(ikonProjek(p.NamaProjek)) + '</span>' + (p.Lokasi ? '<span class="loc">' + ic('map-pin', 'sm') + '<span>' + esc(p.Lokasi) + '</span></span>' : '') + '</div>' +
    '<div class="row between small"><span class="row" style="gap:6px;font-weight:700">' + ic('calendar', 'sm') + fmtTgl(p.TanggalAcara) + '</span><span class="muted">' + (p.JamAcara ? esc(p.JamAcara.replace('-', ' – ')) + ' WIB' : 'Seharian') + '</span></div>' +
    (p.Deskripsi ? '<div class="muted small clamp2">' + esc(p.Deskripsi) + '</div>' : '') +
    '<div class="prog-box"><div class="row between"><b>Progress Tugas</b><b style="color:' + (g.persen >= 100 ? '#16A34A' : 'var(--primary)') + '">' + fmtPct(g.persen) + '% Selesai</b></div><div class="bar" style="margin:8px 0;--bc:' + (p.Status === 'Persiapan' ? '#7C3AED' : g.persen >= 100 ? '#16A34A' : 'var(--primary)') + '"><i style="width:' + g.persen + '%"></i></div><div class="row between xs muted"><span>' + g.selesai + ' dari ' + g.total + ' tugas tuntas</span><span>' + (g.total - g.selesai) + ' tersisa</span></div></div>' +
    (cl.length ? '<div><div class="xs b muted" style="letter-spacing:.06em;margin-bottom:4px">CHECKLIST UTAMA</div>' + cl.map(t => '<div class="cl-item ' + (t.Status === 'Selesai' ? 'done' : '') + '">' + chkBtn('tgs', t.TugasID, t.Status === 'Selesai') + '<span class="cl-t">' + esc(t.NamaTugas) + '</span>' + (t.Status === 'Selesai' ? '<span class="xs" style="color:#15803D;font-weight:700">Selesai</span>' : t.Tenggat ? '<span class="badge ' + (isTelat(t) ? 'b-late' : 'b-idle') + '">' + fmtTgl(t.Tenggat, { pendek: true, tanpaTahun: true }) + '</span>' : '') + '</div>').join('') + '</div>' : '') +
    '<a class="btn btn-soft block" style="margin-top:auto" href="#/projek/' + esc(p.ProjekID) + '">' + (p.Status === 'Selesai' ? ic('file-text') + 'Lihat Rekap Projek' : 'Buka Detail &amp; Checklist Tugas ' + ic('arrow-right')) + '</a></article>';
}
Aksi.menuPrj = el => {
  const p = S.prj.get(el.dataset.id); if (!p) return;
  menuPop(el, [
    { label: 'Ubah projek', ikon: 'pencil', fn: () => formProjek(p) },
    { label: 'Tambah tugas', ikon: 'plus', fn: () => formTugas(p.ProjekID) },
    p.Status !== 'Selesai' ? { label: 'Tandai selesai & arsipkan', ikon: 'circle-check', fn: () => Outbox.push('projek.save', Object.assign(pick(p, PRJ_F), { ProjekID: p.ProjekID, Status: 'Selesai' })) } : null,
    { label: 'Buat rekap dokumen', ikon: 'file-text', fn: () => go('#/dokumen/buat/REKPRJ/' + p.ProjekID) },
    { label: 'Hapus projek', ikon: 'trash-2', bahaya: true, fn: () => formProjek(p) }
  ]);
};
page('projek', {
  judul: 'Projek & Event',
  render(el, id) {
    if (id) return renderDetailProjek(el, id);
    el._detail = null; el._h = null;
    const semua = [...S.prj.values()], tab = S.ui.pTab || 'semua', urut = S.ui.pUrut || 'hariH';
    const n = { semua: semua.length, Berjalan: semua.filter(p => p.Status === 'Berjalan').length, Persiapan: semua.filter(p => p.Status === 'Persiapan').length, Selesai: semua.filter(p => p.Status === 'Selesai').length };
    let list = semua.filter(p => tab === 'semua' || p.Status === tab);
    const td = today();
    list.sort(urut === 'nama' ? (a, b) => a.NamaProjek.localeCompare(b.NamaProjek, 'id') : urut === 'progres' ? (a, b) => progres(b.ProjekID).persen - progres(a.ProjekID).persen
      : (a, b) => ((a.Status === 'Selesai') - (b.Status === 'Selesai')) || (Math.abs(diffHari(td, a.TanggalAcara)) - Math.abs(diffHari(td, b.TanggalAcara))));
    const owner = isOwner();
    el.innerHTML = '<div class="page-head"><div><div class="kick"><span class="pill blue" style="height:30px">' + ic('layers', 'sm') + 'MANAJEMEN EVENT KAMPUS</span><span class="pill" style="height:30px"><i class="dot"></i>' + semester(ymNow()) + '</span></div><h1 class="h1">Projek &amp; Event Kampus</h1><p class="lead">Pantau event besar universitas beserta daftar tugas bertenggat yang tersinkron otomatis ke Google Kalender.</p></div>' +
      '<div class="acts"><select class="sel sm" style="width:auto" data-urut aria-label="Urutkan"><option value="hariH" ' + (urut === 'hariH' ? 'selected' : '') + '>Urutkan: Hari-H Terdekat</option><option value="progres" ' + (urut === 'progres' ? 'selected' : '') + '>Urutkan: Progres</option><option value="nama" ' + (urut === 'nama' ? 'selected' : '') + '>Urutkan: Nama</option></select>' + (owner ? '<button class="btn btn-primary" data-act="projekBaru">' + ic('circle-plus') + 'Tambah Projek Baru</button>' : '') + '</div></div>' +
      '<div class="grid g4">' + kpiProjek('Total Projek', n.semua, 'Semua terdata', 'folder-open', 'c-biru') + kpiProjek('Sedang Berjalan', n.Berjalan, 'Dalam eksekusi', 'rocket', 'c-biru') + kpiProjek('Tahap Persiapan', n.Persiapan, 'Perencanaan materi', 'sparkles', 'c-ungu') + kpiProjek('Selesai', n.Selesai, 'Dokumen terarsip', 'circle-check', 'c-hijau') + '</div>' +
      '<div class="row between wrap mt-l"><div class="seg">' + [['semua', 'Semua Projek'], ['Berjalan', 'Sedang Berjalan'], ['Persiapan', 'Tahap Persiapan'], ['Selesai', 'Selesai']].map(([k, l]) => '<button class="' + (tab === k ? 'on' : '') + '" data-act="pTab" data-k="' + k + '">' + l + ' (' + n[k] + ')</button>').join('') + '</div>' +
      '<span class="pill">' + ic('calendar', 'sm') + 'Google Kalender Sync: <b style="color:var(--primary)">' + (S.set.KALENDER_AKTIF === 'TIDAK' ? 'Nonaktif' : 'Aktif • Realtime') + '</b></span></div>' +
      '<div class="grid g3 prj mt-l">' + list.map(prjCard).join('') + (owner ? '<button class="card add-card hov" data-act="projekBaru"><div><div class="plus">' + ic('plus', 'xl') + '</div><div class="h3">+ Rencanakan Projek Baru</div><p class="muted small" style="max-width:260px;margin:8px auto 16px">Mulai kelola event kampus baru dengan checklist tugas dan sinkronisasi otomatis kalender akademik.</p><span class="btn btn-primary sm">' + ic('square-pen', 'sm') + 'Buat Projek Sekarang</span></div></button>' : '') +
      (!list.length && !owner ? '<div class="card" style="grid-column:1/-1">' + kosong('folder-open', 'Belum ada projek', 'Projek/event yang dibuat pemilik akan tampil di sini.') + '</div>' : '') + '</div>' +
      '<section class="card mt-l row wrap" style="gap:16px"><span class="k-ic" style="width:52px;height:52px;border-radius:16px;background:var(--primary-soft);color:var(--primary);display:grid;place-items:center">' + ic('calendar-check', 'lg') + '</span><div style="flex:1;min-width:220px"><b>Sinkronisasi Otomatis Google Calendar Aktif</b><div class="small muted">Setiap perubahan tanggal atau tenggat tugas di halaman ini langsung memperbarui kalender tim medsos.</div></div>' + (owner ? '<button class="btn btn-soft sm" data-act="sinkronUlang">' + ic('refresh-cw', 'sm') + 'Sinkronkan Sekarang</button>' : '') + '<a class="btn btn-ghost sm" href="#/kalender">' + ic('external-link', 'sm') + 'Buka Kalender</a></section>';
    el.querySelector('[data-urut]').onchange = e => { S.ui.pUrut = e.target.value; Store.set('ui', S.ui); emit(); };
  }
});
function kpiProjek(l, v, s, i, w) { return '<div class="card kpi"><div class="k-top"><span class="k-lbl">' + l + '</span><span class="k-ic ' + w + '">' + ic(i) + '</span></div><div class="k-val num">' + v + ' <span class="small muted" style="font-weight:600">Projek</span></div><div class="k-sub">' + s + '</div></div>'; }
Aksi.pTab = el => { S.ui.pTab = el.dataset.k; Store.set('ui', S.ui); emit(); };

function renderDetailProjek(el, id) {
  const p = S.prj.get(id);
  if (!p) { el._detail = null; el.innerHTML = '<div class="card mt-l">' + kosong('folder-open', 'Projek tidak ditemukan', 'Mungkin sudah dihapus.', '<a class="btn btn-soft mt" href="#/projek">Kembali ke daftar projek</a>') + '</div>'; return; }
  const owner = isOwner();
  if (el._detail !== id + owner) {
    el._detail = id + owner;
    el.innerHTML = '<div class="row between wrap" style="margin-top:8px"><a class="link" href="#/projek">' + ic('arrow-left', 'sm') + 'Semua Projek</a>' + (owner ? '<div class="row"><button class="btn btn-white sm" data-act="ubahPrj" data-id="' + esc(id) + '">' + ic('pencil', 'sm') + 'Ubah</button><a class="btn btn-soft sm" href="#/dokumen/buat/REKPRJ/' + esc(id) + '">' + ic('file-text', 'sm') + 'Buat Rekap Dokumen</a></div>' : '') + '</div>' +
      '<section class="card mt" style="padding:0;overflow:hidden" data-part="hd"></section>' +
      '<div class="dash-grid"><section class="card"><div data-part="th"></div>' +
      (owner ? '<form class="quick-add" data-qt style="margin:0 0 14px"><input name="n" maxlength="160" placeholder="+ Tambah tugas projek cepat…" aria-label="Nama tugas" autocomplete="off"><input name="t" type="date" class="in sm" style="width:auto;min-height:40px;background:#fff" aria-label="Tenggat"><button class="btn btn-primary sm">Tambah</button></form>' : '') +
      '<div class="tlist" data-part="tl"></div></section><section class="card" data-part="ct"></section></div>';
    const qt = el.querySelector('[data-qt]');
    if (qt) qt.onsubmit = e => {
      e.preventDefault();
      const pid = S.route.args[0], nama = qt.n.value.trim();
      if (!nama) { qt.n.focus(); return; }
      Outbox.push('tugas.save', { TugasID: tmpId(), ProjekID: pid, NamaTugas: nama, Tenggat: qt.t.value ? qt.t.value + ' 17:00' : '', Status: 'Belum' });
      qt.n.value = ''; qt.n.focus();
    };
  }
  const g = progres(id), tt = tugasProjek(id);
  const ctn = semuaCatatan().filter(c => c.ProjekID === id).sort((a, b) => (a.Tenggat < b.Tenggat ? -1 : 1));
  const baris = t => taskRow(itemTgs(t), { tanpaProjek: true, tanggal: true });
  part(el, 'hd', '<div class="prj-banner ' + gradProjek(p) + '" style="height:120px;border-radius:0;padding:16px 18px"><span class="big">' + ic(ikonProjek(p.NamaProjek)) + '</span><div style="position:relative"><div class="row wrap" style="gap:6px;margin-bottom:8px">' + projekBadge(p.Status) + (p.Status !== 'Selesai' ? '<span class="badge" style="background:rgba(255,255,255,.9);color:var(--text)">' + ic('alarm-clock') + hMinus(p.TanggalAcara) + '</span>' : '') + '</div><h1 class="h1" style="color:#fff;font-size:24px;line-height:1.2">' + esc(p.NamaProjek) + '</h1></div></div>' +
    '<div style="padding:22px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center"><div class="stack s"><div class="row wrap" style="gap:18px;font-weight:600"><span class="row" style="gap:6px">' + ic('calendar', 'sm') + fmtTgl(p.TanggalAcara, { hari: true }) + (p.JamAcara ? ' • ' + esc(p.JamAcara.replace('-', '–')) + ' WIB' : '') + '</span>' + (p.Lokasi ? '<span class="row" style="gap:6px">' + ic('map-pin', 'sm') + esc(p.Lokasi) + '</span>' : '') + (p.Penyelenggara ? '<span class="row" style="gap:6px">' + ic('users', 'sm') + esc(p.Penyelenggara) + '</span>' : '') + '</div>' +
    (p.TanggalMulai ? '<div class="small muted">Persiapan sejak ' + fmtTgl(p.TanggalMulai) + '</div>' : '') + (p.Deskripsi ? '<p style="margin:4px 0 0">' + esc(p.Deskripsi) + '</p>' : '') + '<div>' + syncTag(p) + '</div></div>' +
    ringSvg(g.persen, { size: 92, stroke: 10, label: g.selesai + '/' + g.total, sub: 'TUGAS', font: 19, color: g.persen >= 100 ? '#16A34A' : '#2F6BFF' }) + '</div>');
  part(el, 'th', '<div class="card-head"><div class="ttl"><h2 class="h3">Checklist Tugas Projek</h2><span class="badge b-run">' + fmtPct(g.persen) + '%</span></div>' + (owner ? '<button class="btn btn-soft sm" data-act="tambahTugas" data-id="' + esc(id) + '">' + ic('plus', 'sm') + 'Tugas</button>' : '') + '</div>');
  part(el, 'tl', tt.length ? tt.map(baris).join('') : kosong('list-todo', 'Belum ada tugas', 'Pecah projek menjadi tugas-tugas kecil bertenggat.'));
  part(el, 'ct', '<div class="card-head"><div class="ttl"><h2 class="h3">Catatan Terkait</h2><span class="badge b-idle">' + ctn.length + '</span></div>' + (owner ? '<a class="icon-btn sq" href="#/catatan/baru/' + today() + '/' + esc(id) + '" aria-label="Catatan baru">' + ic('plus') + '</a>' : '') + '</div><div class="tlist">' +
    (ctn.length ? ctn.map(c => taskRow({ kind: 'ctn', id: c.ID, judul: c.Judul, kategori: c.Kategori, tenggat: c.Tenggat, status: c.Status, prioritas: c.Prioritas, projek: p, rec: c }, { tanggal: true, tanpaProjek: true })).join('') : kosong('notebook-pen', 'Belum ada catatan terkait', 'Pilih projek ini di form catatan.')) + '</div>');
}
Aksi.ubahPrj = el => formProjek(S.prj.get(el.dataset.id));
Aksi.tambahTugas = el => formTugas(el.dataset.id);

/* =====================================================================
   KALENDER BULANAN
   ===================================================================== */
function itemPerTanggal(ym, kat) {
  const map = {};
  const add = (d, x) => { (map[d] = map[d] || []).push(x); };
  itemGabungan().forEach(x => { if (x.tenggat && x.tenggat.slice(0, 7) === ym && (!kat || x.kategori === kat)) add(x.tenggat.slice(0, 10), x); });
  const hp = {};
  hariPentingList(ym + '-01', akhirBulan(ym)).forEach(h => { (hp[h.tgl] = hp[h.tgl] || []).push(h); });
  S.prj.forEach(p => { if (p.Status === 'Selesai' && p.TanggalAcara.slice(0, 7) === ym) (hp[p.TanggalAcara] = hp[p.TanggalAcara] || []).push({ tgl: p.TanggalAcara, judul: p.NamaProjek, jenis: 'projek', id: p.ProjekID }); });
  return { map, hp };
}
function warnaItem(x) { return x.kind === 'tgs' ? 'biru' : katInfo(x.kategori).warna; }
page('kalender', {
  judul: 'Kalender Bulanan',
  render(el) {
    const td = today();
    const k = S.ui.kal = Object.assign({ ym: ymNow(), sel: td, view: 'bulan', kat: '' }, S.ui.kal || {});
    if (!k.sel || k.sel.slice(0, 7) !== k.ym) k.sel = k.ym === ymNow() ? td : k.ym + '-01';
    const awal = k.ym + '-01';
    let memuat = false;
    if (S.dari && awal < S.dari) { const key = awal + '_' + (akhirBulan(k.ym) < S.dari ? akhirBulan(k.ym) : addDays(S.dari, -1)); if (S.arsipRng[key] !== S.ver) { memuat = true; pastikanRentang(awal, akhirBulan(k.ym)); } }
    const { map, hp } = itemPerTanggal(k.ym, k.kat), owner = isOwner(), now = nowStr();
    const offset = (dow(awal) + 6) % 7, nHari = WPStat.hariDalamBulan(k.ym), sel = k.sel;
    const sel3 = [];
    for (let i = 0; i < offset; i++) sel3.push({ d: addDays(awal, i - offset), out: true });
    for (let i = 1; i <= nHari; i++) sel3.push({ d: k.ym + '-' + p2(i) });
    while (sel3.length % 7) sel3.push({ d: addDays(sel3[sel3.length - 1].d, 1), out: true });
    const cells = sel3.map(c => {
      const it = c.out ? [] : (map[c.d] || []), h = c.out ? [] : (hp[c.d] || []), wd = dow(c.d);
      const dots = [...new Set(it.map(warnaItem))].slice(0, 4).map(w => '<i class="c-' + w + '"></i>').join('');
      const evs = it.slice().sort(byTenggat);
      return '<button class="cal-cell' + (c.out ? ' out' : '') + (c.d === td ? ' today' : '') + (c.d === sel ? ' sel' : '') + (wd === 0 ? ' sun' : '') + '" data-act="calSel" data-d="' + c.d + '" aria-label="' + fmtTgl(c.d, { hari: true }) + ', ' + it.length + ' agenda">' +
        '<div class="dn"><span>' + +c.d.slice(8) + '</span><span class="mk">' + (h.some(x => x.jenis === 'catatan') ? ic('star', 'star') : '') + (h.some(x => x.jenis === 'projek') ? ic('flag', 'flag') : '') + '</span></div>' +
        '<div class="cal-dots">' + dots + (h.length && !dots ? '<i style="background:#F59E0B"></i>' : '') + '</div>' +
        h.slice(0, 1).map(x => '<div class="cal-ev c-' + (x.jenis === 'projek' ? 'pink' : 'kuning') + '">' + (x.jenis === 'projek' ? '🚩 ' : '⭐ ') + esc(x.judul) + '</div>').join('') +
        evs.slice(0, h.length ? 1 : 2).map(x => '<div class="cal-ev c-' + warnaItem(x) + (x.status === 'Selesai' ? ' done' : '') + '">' + esc(x.judul) + '</div>').join('') +
        (evs.length > (h.length ? 1 : 2) ? '<div class="cal-more">+' + (evs.length - (h.length ? 1 : 2)) + ' agenda</div>' : '') + '</button>';
    }).join('');
    const hari = (map[sel] || []).slice().sort(urutStabil);
    const hHari = hp[sel] || [];
    const hariF = hari;
    const semuaBulan = Object.values(map).flat();
    const sb = semuaBulan.filter(x => x.status === 'Selesai').length;
    const mendatang = semuaBulan.filter(x => x.status !== 'Selesai' && x.tenggat >= now).length;
    const perhatian = semuaBulan.filter(x => x.status !== 'Selesai' && x.tenggat < now);
    const panel = '<div class="row between"><span class="badge b-run">' + (sel === td ? '● HARI INI' : relHari(sel)) + '</span><span class="small muted">' + hari.length + ' Agenda</span></div>' +
      '<h2 class="h2" style="margin-top:10px">' + fmtTgl(sel, { hari: true }) + '</h2>' +
      (hHari.length ? '<div class="stack s mt">' + hHari.map(h => '<div class="info-box ' + (h.jenis === 'projek' ? 'bad' : 'warn') + ' small">' + ic(h.jenis === 'projek' ? 'flag' : 'star', 'sm') + '<div><b>' + (h.jenis === 'projek' ? 'Hari-H: ' : 'Hari penting: ') + esc(h.judul) + '</b>' + (h.sub ? '<div class="xs">' + esc(h.sub) + '</div>' : '') + '</div></div>').join('') + '</div>' : '') +
      (hari.length ? '<div class="small muted mt">' + hari.filter(x => x.status === 'Selesai').length + ' dari ' + hari.length + ' agenda selesai</div>' : '') +
      '<div class="stack s mt">' + (hariF.length ? hariF.map(x => '<div class="day-item ' + (x.status === 'Selesai' ? 'done' : '') + '">' + chkBtn(x.kind, x.id, x.status === 'Selesai') + '<div style="flex:1;min-width:0"><div class="row wrap" style="gap:6px;margin-bottom:4px">' + (x.kind === 'ctn' ? katChip(x.kategori) : '<span class="chip c-biru">Tugas Projek</span>') + (x.status !== 'Selesai' && x.tenggat < now ? '<span class="badge b-late">Terlambat</span>' : x.prioritas === 'Penting' ? '<span class="prio">' + ic('star') + 'Penting</span>' : '') + '</div>' +
        '<div class="di-t" data-act="buka" data-kind="' + x.kind + '" data-id="' + esc(x.id) + '" style="cursor:pointer">' + esc(x.judul) + '</div><div class="xs muted row" style="gap:6px;margin-top:4px">' + ic('clock', 'sm') + jam(x.tenggat) + ' WIB' + (x.projek ? ' • ' + esc(x.projek.NamaProjek) : '') + '</div></div></div>').join('')
        : kosong('calendar', 'Tidak ada agenda', owner ? 'Tanggal ini masih kosong.' : 'Belum ada tugas pada tanggal ini.')) + '</div>' +
      (owner ? '<a class="btn btn-primary block mt" href="#/catatan/baru/' + sel + '">' + ic('plus') + 'Tambah Tugas di Tanggal Ini</a>' : '') +
      '<div class="info-box mt xs">' + ic('refresh-cw', 'sm') + '<span>Event ini otomatis tersinkron ke Google Calendar pemilik.</span></div>';
    let isi;
    if (k.view === 'minggu') {
      const sen = addDays(sel, -((dow(sel) + 6) % 7));
      const all = itemGabungan();
      isi = '<div class="week-grid">' + [0, 1, 2, 3, 4, 5, 6].map(i => { const d = addDays(sen, i), it = all.filter(x => x.tenggat && x.tenggat.slice(0, 10) === d && (!k.kat || x.kategori === k.kat)).sort(byTenggat); return '<div class="week-col ' + (d === td ? 'today' : '') + '"><h4>' + HARI[dow(d)] + '<b>' + +d.slice(8) + ' ' + BLN[+d.slice(5, 7) - 1] + '</b></h4>' + (it.length ? it.map(x => '<div class="week-ev c-' + warnaItem(x) + '" data-act="buka" data-kind="' + x.kind + '" data-id="' + esc(x.id) + '" style="cursor:pointer;' + (x.status === 'Selesai' ? 'text-decoration:line-through;opacity:.7' : '') + '"><small>' + jam(x.tenggat) + '</small>' + esc(x.judul) + '</div>').join('') : '<div class="xs faint">—</div>') + '</div>'; }).join('') + '</div>';
    } else if (k.view === 'agenda') {
      const all = itemGabungan().filter(x => x.tenggat && x.tenggat.slice(0, 10) >= sel && x.tenggat.slice(0, 10) <= addDays(sel, 30) && (!k.kat || x.kategori === k.kat)).sort(byTenggat);
      const grup = {}; all.forEach(x => { (grup[x.tenggat.slice(0, 10)] = grup[x.tenggat.slice(0, 10)] || []).push(x); });
      isi = Object.keys(grup).length ? Object.keys(grup).map(d => '<div class="mb"><div class="row" style="gap:10px;margin-bottom:8px"><div class="datebox ' + (d === td ? '' : 'soft') + '" style="width:48px;min-height:48px"><b style="font-size:18px">' + +d.slice(8) + '</b><small>' + BLN[+d.slice(5, 7) - 1].toUpperCase() + '</small></div><b>' + HARI[dow(d)] + '</b><span class="muted small">' + relHari(d) + '</span></div><div class="tlist">' + grup[d].map(x => taskRow(x)).join('') + '</div></div>').join('') : kosong('calendar', 'Tidak ada agenda 30 hari ke depan', '');
    } else {
      isi = '<div class="cal-grid">' + ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'].map((h, i) => '<div class="cal-dow ' + (i === 5 ? 'sat' : i === 6 ? 'sun' : '') + '">' + h + '</div>').join('') + cells + '</div>';
    }
    el.innerHTML = '<section class="card mt"><div class="cal-head"><div class="cal-title"><div class="row" style="gap:6px"><button class="icon-btn sq" data-act="calNav" data-n="-1" aria-label="Bulan sebelumnya">' + ic('chevron-left') + '</button><button class="icon-btn sq" data-act="calNav" data-n="1" aria-label="Bulan berikutnya">' + ic('chevron-right') + '</button></div>' +
      '<div><h1 class="h2">' + BULAN[+k.ym.slice(5) - 1] + ' <span style="color:var(--primary)">' + k.ym.slice(0, 4) + '</span>' + (memuat ? ' ' + ic('loader-circle', 'spin') : '') + '</h1><div class="xs muted">' + semester(k.ym) + '</div></div><button class="pill blue" data-act="calToday">' + ic('calendar', 'sm') + 'Hari Ini (' + +td.slice(8) + ' ' + BLN[+td.slice(5, 7) - 1] + ')</button></div>' +
      '<div class="row wrap"><div class="seg">' + [['bulan', 'Bulan', 'layout-grid'], ['minggu', 'Minggu', 'columns-3'], ['agenda', 'Agenda', 'list']].map(([v, l, i]) => '<button class="' + (k.view === v ? 'on' : '') + '" data-act="calView" data-v="' + v + '">' + ic(i, 'sm') + l + '</button>').join('') + '</div>' +
      '<select class="sel sm" style="width:auto" data-kat aria-label="Filter kategori"><option value="">Semua Kategori</option>' + kategoriList().map(c => '<option ' + (k.kat === c.nama ? 'selected' : '') + '>' + esc(c.nama) + '</option>').join('') + '</select>' + (owner ? '<a class="btn btn-primary sm" href="#/catatan/baru/' + sel + '">' + ic('plus', 'sm') + 'Tambah Agenda</a>' : '') + '</div></div></section>' +
      '<div class="legend mt"><b class="xs" style="letter-spacing:.06em">KATEGORI:</b>' + kategoriList().map(c => '<span class="lg c-' + c.warna + '"><i></i>' + esc(c.nama) + '</span>').join('') + '<span class="lg c-biru"><i></i>Tugas Projek</span><span class="lg">' + ic('star', 'sm') + 'Hari Penting</span><span class="lg">' + ic('flag', 'sm') + 'Hari-H Projek</span><span class="lg" style="color:var(--primary)">' + ic('refresh-cw', 'sm') + 'Otomatis sinkron Google Calendar HP</span></div>' +
      '<div class="cal-wrap mt"><section class="card">' + isi + '</section><section class="card">' + panel + '</section></div>' +
      '<div class="grid g4 mt-l">' + '<div class="card kpi"><div class="k-top"><span class="k-lbl">Total Agenda Bulan Ini</span><span class="k-ic">' + ic('calendar') + '</span></div><div class="k-val">' + semuaBulan.length + '</div><div class="k-sub" style="color:var(--primary)">' + Object.keys(hp).length + ' hari penting/hari-H</div></div>' +
      '<div class="card kpi kpi-prog" style="flex-direction:row;justify-content:space-between"><div><div class="k-lbl">Agenda Selesai</div><div class="k-val">' + sb + ' <span class="small" style="color:#16A34A">(' + Math.round(pct(sb, semuaBulan.length)) + '%)</span></div></div>' + ringSvg(pct(sb, semuaBulan.length), { size: 64, stroke: 7, font: 14 }) + '</div>' +
      '<div class="card kpi"><div class="k-top"><span class="k-lbl">Mendatang (Upcoming)</span><span class="k-ic c-ungu">' + ic('calendar-clock') + '</span></div><div class="k-val">' + mendatang + '</div><div class="k-sub">' + (hariPentingList(td)[0] ? 'Termasuk ' + esc(hariPentingList(td)[0].judul) : 'Belum ada') + '</div></div>' +
      '<div class="card kpi"><div class="k-top"><span class="k-lbl">Perlu Perhatian</span><span class="k-ic c-pink">' + ic('bell-ring') + '</span></div><div class="k-val" style="color:' + (perhatian.length ? 'var(--late)' : 'inherit') + '">' + perhatian.length + '</div><div class="k-sub" style="color:var(--late)">' + (perhatian[0] ? ic('triangle-alert', 'sm') + ' ' + esc(perhatian[0].judul) : '<span style="color:#16A34A">Semua aman</span>') + '</div></div></div>';
    el.querySelector('[data-kat]').onchange = e => { k.kat = e.target.value; Store.set('ui', S.ui); emit(); };
  }
});
Aksi.calSel = el => { S.ui.kal.sel = el.dataset.d; if (el.dataset.d.slice(0, 7) !== S.ui.kal.ym) S.ui.kal.ym = el.dataset.d.slice(0, 7); emit(); if (innerWidth < 1100) setTimeout(() => { const p = $('.page[data-page="kalender"] .cal-wrap > .card:last-child'); p && p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); };
Aksi.calNav = el => { const k = S.ui.kal; k.ym = geserBulan(k.ym, +el.dataset.n); k.sel = k.ym === ymNow() ? today() : k.ym + '-01'; Store.set('ui', S.ui); emit(); };
Aksi.calToday = () => { S.ui.kal.ym = ymNow(); S.ui.kal.sel = today(); emit(); };
Aksi.calView = el => { S.ui.kal.view = el.dataset.v; Store.set('ui', S.ui); emit(); };

/* =====================================================================
   LAPORAN & REKAP — daftar pekerjaan yang sudah dikerjakan per periode
   (Harian / Mingguan / Bulanan), siap cetak & unduh CSV
   ===================================================================== */
function rentangTgl(a, b) {
  const [ya, ma, da] = ymdParts(a), [yb, mb, db] = ymdParts(b);
  if (ya === yb && ma === mb) return da + '–' + db + ' ' + BULAN[mb - 1] + ' ' + yb;
  if (ya === yb) return da + ' ' + BLN[ma - 1] + ' – ' + db + ' ' + BLN[mb - 1] + ' ' + yb;
  return fmtTgl(a, { pendek: true }) + ' – ' + fmtTgl(b, { pendek: true });
}
function periodeLap(L) {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(L.tgl || '') ? L.tgl : today();
  if (L.mode === 'hari') return { mode: 'hari', a: t, b: t, label: fmtTgl(t, { hari: true }), link: t, file: t };
  if (L.mode === 'minggu') { const a = addDays(t, -((dow(t) + 6) % 7)), b = addDays(a, 6); return { mode: 'minggu', a, b, label: rentangTgl(a, b), link: 'm-' + a, file: a + '_sd_' + b }; }
  const ym = t.slice(0, 7); return { mode: 'bulan', a: ym + '-01', b: akhirBulan(ym), label: namaBulan(ym), link: ym, file: ym, ym };
}
function dataLap(P) {
  const now = nowStr(), semua = semuaItem(), dalam = d => !!d && d >= P.a && d <= P.b;
  const kunciSelesai = x => String(x.rec.SelesaiPada || x.tenggat || '');
  const selesai = semua.filter(x => x.status === 'Selesai' && dalam(tglSelesai(x))).sort((x, y) => (kunciSelesai(x) < kunciSelesai(y) ? -1 : kunciSelesai(x) > kunciSelesai(y) ? 1 : 0));
  const belum = semua.filter(x => (x.status !== 'Selesai' || nilaiLengket(x.id + ':ikut', false)) && dalam(String(x.tenggat).slice(0, 10))).sort(urutStabil);
  const lewat = x => !!(x.rec.SelesaiPada && x.tenggat && x.rec.SelesaiPada > x.tenggat);
  const prj = [...S.prj.values()].filter(p => dalam(p.TanggalAcara) || (p.Status !== 'Selesai' && (!p.TanggalMulai || p.TanggalMulai <= P.b) && p.TanggalAcara >= P.a) || selesai.some(x => x.projek && x.projek.ProjekID === p.ProjekID))
    .sort((a, b) => (a.TanggalAcara < b.TanggalAcara ? -1 : 1));
  return {
    selesai, belum: belum, lewat,
    harian: selesai.filter(x => !isEventItem(x)), event: selesai.filter(isEventItem),
    tepat: selesai.filter(x => !lewat(x)).length,
    terlambat: belum.filter(x => x.status !== 'Selesai' && x.tenggat && x.tenggat < now),
    prj
  };
}
function lapItem(x, lewat) {
  const sp = x.rec.SelesaiPada;
  const info = [x.kind === 'ctn' ? esc(x.kategori) : '', x.projek ? esc(x.projek.NamaProjek) : '', sp ? 'selesai ' + jam(sp) + ' WIB' : ''].filter(Boolean).join(' • ');
  return '<li class="lap-it"><span class="lap-ck">' + ic('check') + '</span><div style="min-width:0"><div class="lap-t" data-act="buka" data-kind="' + x.kind + '" data-id="' + esc(x.id) + '">' + esc(x.judul) + (x.prioritas === 'Penting' ? ' ' + ic('star', 'star') : '') + '</div>' +
    '<div class="lap-m">' + info + (lewat(x) ? ' • <span class="lap-late">lewat tenggat ' + fmtTgl(x.tenggat, { pendek: true, tanpaTahun: true }) + '</span>' : '') + '</div></div></li>';
}
function kpiDiam(lbl, val, sub, ikon, warna, gaya) {
  return '<div class="card kpi mini"><span class="k-ic ' + warna + '">' + ic(ikon) + '</span><div style="min-width:0;flex:1"><div class="k-lbl">' + lbl + '</div><div class="k-val num" style="' + (gaya || '') + '">' + val + '</div>' + (sub ? '<div class="k-sub trunc">' + sub + '</div>' : '') + '</div></div>';
}
page('laporan', {
  judul: 'Laporan & Rekap',
  render(el, arg) {
    const L = S.ui.lap = Object.assign({ mode: 'minggu', tgl: today() }, S.ui.lap || {});
    if (arg && el._arg !== arg) {
      el._arg = arg;
      if (/^\d{4}-\d{2}$/.test(arg)) { L.mode = 'bulan'; L.tgl = arg === ymNow() ? today() : arg + '-01'; }
      else if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) { L.mode = 'hari'; L.tgl = arg; }
      else if (/^m-\d{4}-\d{2}-\d{2}$/.test(arg)) { L.mode = 'minggu'; L.tgl = arg.slice(2); }
    }
    const P = periodeLap(L), td = today(), owner = isOwner();
    let memuat = false;
    if (S.dari && P.a < S.dari) { const key = P.a + '_' + (P.b < S.dari ? P.b : addDays(S.dari, -1)); if (S.arsipRng[key] !== S.ver) { memuat = true; pastikanRentang(P.a, P.b); } }
    const D = dataLap(P);
    const kini = P.a <= td && td <= P.b;
    const namaMode = { hari: ['Harian', 'Hari ini'], minggu: ['Mingguan', 'Minggu ini'], bulan: ['Bulanan', 'Bulan ini'] };

    /* Rincian per kategori (tugas harian) + jumlah tugas event */
    const perKat = {}; D.harian.forEach(x => { perKat[x.kategori] = (perKat[x.kategori] || 0) + 1; });
    const rincian = Object.keys(perKat).sort((a, b) => perKat[b] - perKat[a]).map(k => '<span class="chip c-' + katInfo(k).warna + '">' + esc(k) + ' · ' + perKat[k] + '</span>').join('') + (D.event.length ? '<span class="chip c-ungu">' + ic('folder-open') + 'Event · ' + D.event.length + '</span>' : '');

    /* Daftar pekerjaan selesai per tanggal: kolom Harian | Event */
    const g = grupBy(D.selesai, tglSelesai);
    const hariHtml = [...g.keys()].sort().map(d => {
      const xs = g.get(d), h = xs.filter(x => !isEventItem(x)), e = xs.filter(isEventItem);
      const kol = (judul, ikon, cls, arr) => '<div' + (arr.length ? '' : ' class="kosong"') + '><div class="lap-ch ' + cls + '">' + ic(ikon, 'sm') + judul + '<span>' + arr.length + '</span></div>' + (arr.length ? '<ul class="lap-ul">' + arr.map(x => lapItem(x, D.lewat)).join('') + '</ul>' : '<div class="lap-none">Tidak ada</div>') + '</div>';
      return '<div class="lap-day"><div class="lap-dh"><div class="datebox ' + (d === td ? '' : 'soft') + '"><b>' + +d.slice(8) + '</b><small>' + BLN[+d.slice(5, 7) - 1].toUpperCase() + '</small></div><div><b>' + fmtTgl(d, { hari: true }) + (d === td ? ' <span class="badge b-run">Hari ini</span>' : '') + '</b><div class="xs muted">' + xs.length + ' pekerjaan selesai</div></div></div>' +
        '<div class="lap-cols">' + kol('Tugas Harian', 'notebook-pen', '', h) + kol('Tugas Event', 'folder-open', 'ev', e) + '</div></div>';
    }).join('');

    el.innerHTML = '<div class="print-only lap-print-head"><b>' + esc(S.set.NAMA_INSTITUSI || '') + (S.set.UNIT_KERJA ? ' — ' + esc(S.set.UNIT_KERJA) : '') + '</b><div style="font-size:15pt;font-weight:800;margin-top:4px">LAPORAN PEKERJAAN ' + namaMode[P.mode][0].toUpperCase() + '</div><div>Periode: <b>' + esc(P.label) + '</b> • Disusun oleh: <b>' + esc(S.set.NAMA_ADMIN || '') + '</b>' + (S.set.JABATAN_ADMIN ? ' (' + esc(S.set.JABATAN_ADMIN) + ')' : '') + '</div></div>' +
      '<div class="page-head no-print"><div><h1 class="h1">Laporan &amp; Rekap' + (memuat ? ' ' + ic('loader-circle', 'spin') : '') + '</h1><p class="lead">Semua pekerjaan yang sudah kamu centang, dikelompokkan per hari — Tugas Harian dan Tugas Event terpisah. Bisa dicetak atau dibagikan ke atasan.</p></div></div>' +
      '<section class="card lap-ctl no-print"><div class="seg">' + ['hari', 'minggu', 'bulan'].map(m => '<button class="' + (P.mode === m ? 'on' : '') + '" data-act="lapMode" data-m="' + m + '">' + namaMode[m][0] + '</button>').join('') + '</div>' +
      '<div class="lap-nav"><button class="icon-btn sq" data-act="lapNav" data-n="-1" aria-label="Periode sebelumnya">' + ic('chevron-left') + '</button><b class="lap-lbl">' + esc(P.label) + '</b><button class="icon-btn sq" data-act="lapNav" data-n="1" aria-label="Periode berikutnya">' + ic('chevron-right') + '</button>' +
      (kini ? '' : '<button class="btn btn-ghost sm" data-act="lapKini">' + namaMode[P.mode][1] + '</button>') + '</div>' +
      '<div class="lap-acts"><button class="btn btn-white sm" data-act="cetak">' + ic('printer', 'sm') + 'Cetak / PDF</button><button class="btn btn-white sm" data-act="eksporCsv">' + ic('download', 'sm') + 'Unduh CSV</button><button class="btn btn-white sm" data-act="bagikanLap">' + ic('share-2', 'sm') + 'Bagikan</button>' +
      (owner && P.mode === 'bulan' ? '<a class="btn btn-soft sm" href="#/dokumen/buat/LAPKIN/' + P.ym + '">' + ic('file-badge', 'sm') + 'Dokumen Resmi</a>' : '') + '</div></section>' +
      '<div class="kpi-row">' +
      kpiDiam('Sudah dikerjakan', D.selesai.length, 'Harian ' + D.harian.length + ' • Event ' + D.event.length, 'circle-check', 'c-hijau', 'color:#15803D') +
      kpiDiam('Tepat waktu', D.tepat, D.selesai.length ? fmtPct(pct(D.tepat, D.selesai.length)) + '% dari yang selesai' : 'belum ada', 'clock', 'c-biru') +
      kpiDiam('Belum selesai', D.belum.filter(x => x.status !== 'Selesai').length, 'tenggat di periode ini', 'list-todo', 'c-oranye') +
      kpiDiam('Terlambat', D.terlambat.length, D.terlambat.length ? 'perlu ditindaklanjuti' : 'aman 👍', 'circle-alert', D.terlambat.length ? 'c-pink' : 'c-hijau', D.terlambat.length ? 'color:var(--late)' : '') + '</div>' +
      '<section class="card mt"><div class="card-head" style="flex-wrap:wrap;margin-bottom:6px"><div class="ttl">' + ic('circle-check') + '<h2 class="h3">Pekerjaan yang Sudah Dikerjakan</h2></div><span class="badge b-ok">' + D.selesai.length + ' selesai</span></div>' +
      (rincian ? '<div class="rincian">Rincian: ' + rincian + '</div>' : '') +
      '<div class="lap-days mt">' + (hariHtml || kosong('clipboard-list', 'Belum ada pekerjaan selesai di periode ini', 'Centang tugas di Beranda atau Catatan Harian — otomatis tercatat di sini.')) + '</div></section>' +
      '<section class="card mt"><div class="card-head" style="flex-wrap:wrap"><div class="ttl">' + ic('list-todo') + '<h2 class="h3">Belum Selesai (tenggat di periode ini)</h2></div><span class="badge ' + (D.terlambat.length ? 'b-late' : 'b-idle') + '">' + D.belum.filter(x => x.status !== 'Selesai').length + ' tugas</span></div>' +
      (D.belum.length ? '<div class="tlist">' + D.belum.map(x => taskRow(x, { tanggal: true })).join('') + '</div>' : kosong('party-popper', 'Semua tugas di periode ini sudah selesai', '')) + '</section>' +
      '<section class="card mt"><div class="card-head"><div class="ttl">' + ic('folder-open') + '<h2 class="h3">Progres Event</h2></div><span class="badge b-run">' + D.prj.length + ' event</span></div>' +
      (D.prj.length ? '<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Event</th><th>Hari-H</th><th style="min-width:180px">Checklist</th><th>Dikerjakan periode ini</th></tr></thead><tbody>' +
        D.prj.map(p => { const gp = progres(p.ProjekID), n = D.event.filter(x => x.projek && x.projek.ProjekID === p.ProjekID).length; return '<tr><td><a href="#/projek/' + esc(p.ProjekID) + '" style="color:inherit"><b>' + esc(p.NamaProjek) + '</b></a><div class="xs muted">' + projekBadge(p.Status) + '</div></td><td class="small">' + fmtTgl(p.TanggalAcara, { pendek: true }) + '</td>' +
          '<td><div class="row" style="gap:8px"><div class="bar" style="flex:1;--bc:' + (gp.persen >= 100 ? '#16A34A' : 'var(--primary)') + '"><i style="width:' + gp.persen + '%"></i></div><span class="xs b">' + gp.selesai + '/' + gp.total + '</span></div></td><td class="small"><b>' + n + '</b> tugas</td></tr>'; }).join('') + '</tbody></table></div>'
        : kosong('folder-open', 'Tidak ada event pada periode ini', '')) + '</section>' +
      '<section class="print-only" style="margin-top:18px"><div class="sign"><div><div class="xs">Disusun oleh,</div><div class="space"></div><b>' + esc(S.set.NAMA_ADMIN || '') + '</b><div class="xs">' + esc(S.set.JABATAN_ADMIN || '') + (S.set.NIP_ADMIN ? ' • NIP/ID: ' + esc(S.set.NIP_ADMIN) : '') + '</div></div>' +
      '<div><div class="xs">' + esc(S.set.KOTA || '') + ', ' + fmtTgl(td) + '<br>Mengetahui,</div><div class="space"></div><b>' + esc(S.set.ATASAN_NAMA || '................................') + '</b><div class="xs">' + esc(S.set.ATASAN_JABATAN || '') + (S.set.ATASAN_NIP ? ' • NIP: ' + esc(S.set.ATASAN_NIP) : '') + '</div></div></div></section>';
  }
});
function setLap(perubahan) { Object.assign(S.ui.lap, perubahan); Store.set('ui', S.ui); const P = periodeLap(S.ui.lap), el = $('.page[data-page="laporan"]'); if (el) el._arg = P.link; S.route.args = [P.link]; history.replaceState(null, '', '#/laporan/' + P.link); emit(); }
Aksi.lapMode = el => setLap({ mode: el.dataset.m });
Aksi.lapKini = () => setLap({ tgl: today() });
Aksi.lapNav = el => {
  const L = S.ui.lap, n = +el.dataset.n, P = periodeLap(L);
  const tgl = L.mode === 'hari' ? addDays(P.a, n) : L.mode === 'minggu' ? addDays(P.a, 7 * n) : geserBulan(P.ym, n) + '-01';
  setLap({ tgl });
};
Aksi.cetak = () => window.print();
Aksi.eksporCsv = () => {
  const P = periodeLap(S.ui.lap), D = dataLap(P);
  const rows = [['Tanggal Selesai', 'Jam Selesai', 'Pekerjaan', 'Jenis', 'Event', 'Kategori', 'Prioritas', 'Tenggat', 'Status', 'Ketepatan', 'Catatan']];
  const baris = x => [tglSelesai(x) && x.status === 'Selesai' ? tglSelesai(x) : '', x.status === 'Selesai' ? jam(x.rec.SelesaiPada || '') : '', x.judul, isEventItem(x) ? 'Tugas Event' : 'Tugas Harian', x.projek ? x.projek.NamaProjek : '', x.kategori || '', x.prioritas || '', x.tenggat || '', x.status === 'Selesai' ? 'Selesai' : (x.status || 'Belum'),
    x.status === 'Selesai' ? (D.lewat(x) ? 'Lewat tenggat' : 'Tepat waktu') : (x.tenggat && x.tenggat < nowStr() ? 'Terlambat' : '-'), x.kind === 'ctn' ? x.rec.CatatanTambahan || '' : ''];
  D.selesai.forEach(x => rows.push(baris(x)));
  D.belum.filter(x => x.status !== 'Selesai').forEach(x => rows.push(baris(x)));
  unduhBlob(new Blob([csvDari(rows)], { type: 'text/csv;charset=utf-8' }), 'Workplan-Rekap-' + P.file + '.csv');
  toast('CSV diunduh', 'ok', { sub: D.selesai.length + ' selesai • ' + P.label });
};
Aksi.bagikanLap = async () => {
  const P = periodeLap(S.ui.lap);
  const url = (S.set.APP_URL || location.origin + location.pathname).split('#')[0] + '#/laporan/' + P.link;
  const data = { title: 'Laporan Workplan ' + P.label, text: 'Laporan pekerjaan admin medsos (mode lihat saja):', url };
  if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); toast('Link laporan disalin', 'ok', { sub: 'Atasan dapat membuka tanpa PIN (lihat saja).' }); } catch (e) { modal({ judul: 'Salin link laporan', isi: '<input class="in" value="' + esc(url) + '" onfocus="this.select()" autofocus>' }); }
};
Aksi.sinkronUlang = async el => {
  if (!isOwner()) { revalidate(true); toast('Data diperbarui', 'info'); return; }
  setBusy(el, true, 'Menyinkronkan…');
  await Outbox.flush();
  let total = 0, gagal = 0, pesan = '', putaran = 0, res;
  do {
    res = await api('kalenderSinkron', { lanjut: putaran > 0 });
    if (!res.success) { setBusy(el, false); toast('Sinkron ulang gagal', 'err', { sub: res.message }); return; }
    total += res.data.ok; gagal += res.data.gagal; pesan = res.data.pesan || pesan; putaran++;
  } while (res.data.sisa > 0 && res.data.ok > 0 && putaran < 20);
  setBusy(el, false);
  await revalidate(true);
  toast(gagal ? 'Sinkron selesai dengan ' + gagal + ' kegagalan' : 'Kalender tersinkron', gagal ? 'warn' : 'ok', { sub: total + ' agenda diperbarui' + (pesan ? ' • ' + pesan : '') });
};

/* =====================================================================
   PENGATURAN (khusus pemilik)
   ===================================================================== */
page('pengaturan', {
  judul: 'Pengaturan', owner: true, statis: true,
  render(el) {
    const s = Object.assign({}, S.set, (S.owner && S.owner.set) || {}), sis = (S.owner && S.owner.sistem) || {};
    const kats = kategoriList().map(k => Object.assign({ lama: k.nama }, k));
    const f = (k, l, o = {}) => '<div class="field"><label for="s-' + k + '">' + l + '</label><input id="s-' + k + '" class="in" data-k="' + k + '" value="' + esc(s[k] || '') + '" ' + (o.type ? 'type="' + o.type + '"' : '') + ' placeholder="' + esc(o.ph || '') + '">' + (o.hint ? '<div class="hint">' + o.hint + '</div>' : '') + '</div>';
    el.innerHTML = '<div class="page-head"><div><h1 class="h1">Pengaturan</h1><p class="lead">Profil, kategori, Google Kalender, keamanan PIN, dan data contoh. Hanya pemilik yang dapat membuka halaman ini.</p></div></div>' +
      (sis.pinBawaan || S.pinBawaan ? '<div class="info-box warn mb">' + ic('triangle-alert') + '<div><b>PIN masih bawaan (123456).</b> Ganti sekarang agar penonton tidak bisa masuk sebagai pemilik.</div></div>' : '') +
      '<div class="grid g2" style="align-items:start"><div class="stack l" style="gap:var(--gut)">' +
      '<section class="card" data-sec="profil"><div class="card-head"><h2 class="h3 row">' + ic('user') + 'Profil &amp; Institusi</h2></div><div class="stack">' + '<div class="grid g2">' + f('NAMA_ADMIN', 'Nama sapaan / pemilik') + f('NIP_ADMIN', 'NIP / ID pegawai') + '</div>' + f('JABATAN_ADMIN', 'Jabatan') + '<div class="grid g2">' + f('NAMA_INSTITUSI', 'Nama institusi') + f('UNIT_KERJA', 'Unit kerja') + '</div>' + f('KOTA', 'Kota (untuk tanggal dokumen)') +
      '<div class="divider"></div><b class="small">Atasan (Mengetahui)</b><div class="grid g2">' + f('ATASAN_NAMA', 'Nama atasan') + f('ATASAN_NIP', 'NIP atasan') + '</div>' + f('ATASAN_JABATAN', 'Jabatan atasan') + f('TARGET_PERSEN', 'Target ketercapaian bulanan (%)', { type: 'number' }) +
      '<button class="btn btn-primary" data-simpan="profil">' + ic('circle-check') + 'Simpan Profil</button></div></section>' +
      '<section class="card" data-sec="kategori"><div class="card-head"><h2 class="h3 row">' + ic('tag') + 'Kategori Tugas</h2><button class="btn btn-soft sm" data-addkat>' + ic('plus', 'sm') + 'Kategori</button></div><div class="stack s" data-katlist></div><p class="xs muted">Mengganti nama kategori otomatis memperbarui catatan lama. Maks. 12 kategori.</p><button class="btn btn-primary" data-simpan="kategori">' + ic('circle-check') + 'Simpan Kategori</button></section></div>' +
      '<div class="stack l" style="gap:var(--gut)">' +
      '<section class="card" data-sec="kalender"><div class="card-head"><h2 class="h3 row">' + ic('calendar-check') + 'Google Kalender</h2><button class="switch ' + (s.KALENDER_AKTIF !== 'TIDAK' ? 'on' : '') + '" data-sw="KALENDER_AKTIF" aria-label="Aktifkan sinkron kalender"></button></div><div class="stack">' +
      f('KALENDER_ID', 'ID kalender tujuan', { hint: '<b>primary</b> = kalender utama akun Google pemilik. Bisa diganti ID kalender lain (Setelan kalender → Integrasikan kalender).' }) +
      f('PENGINGAT_TUGAS', 'Pengingat tugas (menit sebelum tenggat)', { hint: 'Pisahkan koma. 1440 = 1 hari, 60 = 1 jam. Maks 5.' }) +
      '<div class="grid g2">' + f('PENGINGAT_HARI_PENTING', 'Hari penting (hari sebelum)', { hint: 'Mis. 3,1' }) + f('JAM_PENGINGAT', 'Jam pengingat hari penting', { type: 'time' }) + '</div>' +
      '<div class="grid g2">' + f('DURASI_EVENT', 'Durasi event tugas (menit)', { type: 'number' }) + f('JAM_TUGAS_CEPAT', 'Jam bawaan tugas cepat', { type: 'time' }) + '</div>' +
      '<div class="info-box small">' + ic('smartphone', 'sm') + '<span>Agar notifikasi muncul di HP: pasang aplikasi Google Kalender dengan akun Google yang sama dan izinkan notifikasinya.</span></div>' +
      '<div class="row wrap"><button class="btn btn-primary" data-simpan="kalender">' + ic('circle-check') + 'Simpan Kalender</button><button class="btn btn-soft" data-kalcek>' + ic('scan-line') + 'Cek Koneksi</button><button class="btn btn-ghost" data-kalall>' + ic('refresh-cw') + 'Sinkron Ulang Semua</button></div><div class="small muted" data-kalinfo></div></div></section>' +
      '<section class="card"><div class="card-head"><h2 class="h3 row">' + ic('key-round') + 'Keamanan PIN</h2></div><form class="stack" data-pin novalidate><div class="grid g2"><div class="field"><label>PIN lama</label><input class="in" type="password" inputmode="numeric" maxlength="8" name="lama" autocomplete="current-password"></div><div class="field"><label>PIN baru (6 angka)</label><input class="in" type="password" inputmode="numeric" maxlength="6" name="baru" autocomplete="new-password"></div></div><div class="err" data-pinerr></div>' +
      '<div class="row wrap"><button class="btn btn-primary">' + ic('lock') + 'Ganti PIN</button><button type="button" class="btn btn-ghost" data-logoutall>' + ic('log-out') + 'Keluarkan semua perangkat</button></div><p class="xs muted">PIN disimpan sebagai hash di server. Setelah diganti, perangkat lain otomatis keluar.</p></form></section>' +
      '<section class="card"><div class="card-head"><h2 class="h3 row">' + ic('database') + 'Data &amp; Sistem</h2></div><div class="stack s small">' +
      '<div class="row between"><span class="muted">Versi aplikasi</span><b>' + esc(sis.versi || '1.0.0') + '</b></div><div class="row between"><span class="muted">Pekerja latar (5 menit)</span><b>' + (sis.trigger ? '<span style="color:#16A34A">Aktif</span>' : '<span style="color:var(--late)">Tidak aktif</span>') + '</b></div>' +
      '<div class="row between"><span class="muted">URL aplikasi</span><span class="code trunc" style="max-width:60%">' + esc(s.APP_URL || '-') + '</span></div>' +
      (sis.spreadsheetUrl ? '<a class="btn btn-white sm" target="_blank" rel="noopener" href="' + esc(sis.spreadsheetUrl) + '">' + ic('file-spreadsheet', 'sm') + 'Buka Database (Google Sheets)</a>' : '') + (sis.folderUrl ? '<a class="btn btn-white sm" target="_blank" rel="noopener" href="' + esc(sis.folderUrl) + '">' + ic('folder-open', 'sm') + 'Buka Folder Drive</a>' : '') +
      '<div class="divider"></div><b>Data contoh</b><p class="xs muted" style="margin:0">Isi contoh catatan & projek (Wisuda, Bagi Sembako, PMB) untuk mencoba aplikasi. Tidak dikirim ke kalender & mudah dihapus.</p><div class="row wrap"><button class="btn btn-soft sm" data-contoh="isi">' + ic('sparkles', 'sm') + 'Isi Data Contoh</button><button class="btn btn-ghost sm" style="color:var(--late)" data-contoh="hapus">' + ic('trash-2', 'sm') + 'Hapus Data Contoh</button></div></div></section></div></div>';
    const katBox = el.querySelector('[data-katlist]');
    const gambarKat = () => {
      katBox.innerHTML = kats.map((k, i) => '<div class="row" style="gap:8px"><span class="chip c-' + k.warna + '" style="width:16px;padding:0;height:16px"></span><input class="in sm" data-kn="' + i + '" value="' + esc(k.nama) + '" maxlength="30" aria-label="Nama kategori"><select class="sel sm" style="width:130px" data-kw="' + i + '" aria-label="Warna">' + WARNA.map(w => '<option ' + (k.warna === w ? 'selected' : '') + '>' + w + '</option>').join('') + '</select><button class="icon-btn" data-kd="' + i + '" aria-label="Hapus kategori" ' + (kats.length <= 1 ? 'disabled' : '') + '>' + ic('x') + '</button></div>').join('');
      katBox.querySelectorAll('[data-kn]').forEach(x => x.oninput = () => { kats[+x.dataset.kn].nama = x.value; });
      katBox.querySelectorAll('[data-kw]').forEach(x => x.onchange = () => { kats[+x.dataset.kw].warna = x.value; gambarKat(); });
      katBox.querySelectorAll('[data-kd]').forEach(x => x.onclick = () => { kats.splice(+x.dataset.kd, 1); gambarKat(); });
    };
    gambarKat();
    el.querySelector('[data-addkat]').onclick = () => { if (kats.length >= 12) return toast('Maksimal 12 kategori', 'warn'); kats.push({ nama: 'Kategori ' + (kats.length + 1), warna: WARNA[kats.length % WARNA.length], ikon: 'tag' }); gambarKat(); };
    const simpan = async (btn, patch) => {
      setBusy(btn, true, 'Menyimpan…');
      const lama = Object.assign({}, S.set);
      Object.keys(patch).forEach(k => { if (k === 'KATEGORI') S.set.KATEGORI = JSON.parse(patch.KATEGORI).map(x => ({ nama: x.nama, warna: x.warna, ikon: x.ikon })); else S.set[k] = patch[k]; });
      emit();
      const res = await api('settingsSave', { patch });
      setBusy(btn, false);
      if (!res.success) { S.set = lama; emit(); toast('Gagal menyimpan', 'err', { sub: res.message }); return; }
      S.set = res.data.publik; if (S.owner) S.owner.set = res.data.set; setOwnerData(S.owner);
      toast('Pengaturan tersimpan', 'ok');
      revalidate(true);
      if (res.data.kalenderPerluSinkron && await konfirmasi({ judul: 'Perbarui event kalender?', teks: 'Pengaturan pengingat/kalender berubah. Perbarui semua event yang sudah ada agar ikut aturan baru?', ok: 'Perbarui sekarang' })) sinkronSemua(el.querySelector('[data-kalall]'));
    };
    const ambil = sec => { const o = {}; el.querySelectorAll('[data-sec="' + sec + '"] [data-k]').forEach(x => { o[x.dataset.k] = x.value.trim(); }); return o; };
    el.querySelectorAll('[data-simpan]').forEach(b => b.onclick = () => {
      const sec = b.dataset.simpan;
      if (sec === 'kategori') { if (kats.some(k => !k.nama.trim())) return toast('Nama kategori tidak boleh kosong', 'err'); return simpan(b, { KATEGORI: JSON.stringify(kats.map(k => ({ nama: k.nama.trim(), warna: k.warna, ikon: k.ikon || 'tag', lama: k.lama }))) }); }
      const p = ambil(sec);
      if (sec === 'kalender') p.KALENDER_AKTIF = el.querySelector('[data-sw="KALENDER_AKTIF"]').classList.contains('on') ? 'YA' : 'TIDAK';
      simpan(b, p);
    });
    el.querySelector('[data-sw]').onclick = e => e.currentTarget.classList.toggle('on');
    const info = el.querySelector('[data-kalinfo]');
    el.querySelector('[data-kalcek]').onclick = async e => { setBusy(e.currentTarget, true, 'Mengecek…'); const r = await api('kalenderInfo', {}); setBusy(e.currentTarget, false); info.innerHTML = r.success ? (r.data.galat ? '<span style="color:var(--late)">' + esc(r.data.galat) + '</span>' : ic('circle-check', 'sm') + ' Terhubung ke <b>' + esc(r.data.nama) + '</b> • ' + r.data.tertunda + ' agenda menunggu sinkron') : esc(r.message); };
    const sinkronSemua = async btn => {
      setBusy(btn, true, 'Menyinkronkan…'); let ok = 0, gagal = 0, n = 0, r;
      do { r = await api('kalenderSinkron', { semua: true, lanjut: n > 0 }); if (!r.success) break; ok += r.data.ok; gagal += r.data.gagal; n++; info.textContent = ok + ' agenda diperbarui, sisa ' + r.data.sisa + '…'; } while (r.data.sisa > 0 && r.data.ok > 0 && n < 30);
      setBusy(btn, false); revalidate(true);
      if (!r.success) toast('Sinkron gagal', 'err', { sub: r.message }); else toast('Semua agenda tersinkron', gagal ? 'warn' : 'ok', { sub: ok + ' berhasil, ' + gagal + ' gagal' });
    };
    el.querySelector('[data-kalall]').onclick = e => sinkronSemua(e.currentTarget);
    const fp = el.querySelector('[data-pin]');
    fp.onsubmit = async e => {
      e.preventDefault(); const err = el.querySelector('[data-pinerr]'); err.textContent = '';
      if (!/^\d{6}$/.test(fp.baru.value)) { err.textContent = 'PIN baru harus 6 angka.'; return; }
      const b = fp.querySelector('.btn-primary'); setBusy(b, true, 'Menyimpan…');
      const r = await api('pinGanti', { lama: fp.lama.value, baru: fp.baru.value }); setBusy(b, false);
      if (!r.success) { err.textContent = r.message; return; }
      S.token = r.data.token; S.exp = r.data.exp; S.pinBawaan = false; Store.set('auth', { token: S.token, exp: S.exp });
      if (S.owner && S.owner.sistem) S.owner.sistem.pinBawaan = false;
      fp.reset(); toast('PIN berhasil diganti', 'ok', { sub: 'Perangkat lain otomatis keluar.' }); route();
    };
    el.querySelector('[data-logoutall]').onclick = async () => { if (!(await konfirmasi({ judul: 'Keluarkan semua perangkat?', teks: 'Semua sesi Mode Pemilik (termasuk perangkat ini) akan berakhir.', ok: 'Keluarkan', bahaya: true }))) return; const r = await api('logoutAll', {}); if (r.success) { S.token = ''; S.exp = 0; Store.del('auth'); toast('Semua perangkat keluar', 'ok'); go('#/beranda'); } };
    el.querySelectorAll('[data-contoh]').forEach(b => b.onclick = async () => {
      const aksi = b.dataset.contoh;
      if (aksi === 'hapus' && !(await konfirmasi({ judul: 'Hapus data contoh?', teks: 'Semua catatan, projek, dan tugas contoh akan dihapus.', ok: 'Hapus', bahaya: true }))) return;
      setBusy(b, true); const r = await api('dataContoh', { aksi }); setBusy(b, false);
      if (!r.success) return toast(r.message, 'err');
      toast(r.message, 'ok'); await revalidate(true); segarkanOwner(true);
    });
  }
});

/* =====================================================================
   VERIFIKASI DOKUMEN (publik) — #/v/KODE
   ===================================================================== */
page('v', {
  judul: 'Verifikasi Dokumen', statis: true,
  async render(el, kode) {
    el.innerHTML = '<div class="verif"><div class="page-head"><div><div class="kick"><span class="pill blue" style="height:30px">' + ic('shield-check', 'sm') + 'Verifikasi Keaslian</span></div><h1 class="h1">Cek Dokumen WORKPLAN</h1><p class="lead">Pindai QR pada dokumen atau masukkan kode verifikasi untuk memastikan dokumen asli dan masih berlaku.</p></div></div>' +
      '<form class="card row wrap" data-vf><input class="in" name="k" style="flex:1;min-width:220px" placeholder="Kode verifikasi, mis. WP3F9A…" value="' + esc(kode || '') + '" aria-label="Kode verifikasi"><button class="btn btn-primary">' + ic('search') + 'Cek</button></form><div data-hasil class="mt-l"></div></div>';
    const f = el.querySelector('[data-vf]'), out = el.querySelector('[data-hasil]');
    const cek = async k => {
      k = String(k || '').trim(); if (!k) return;
      out.innerHTML = '<div class="card"><div class="skel" style="height:24px;width:60%"></div><div class="skel mt" style="height:80px"></div></div>';
      const r = await api('verifikasi', { kode: k });
      if (!r.success) { out.innerHTML = '<div class="card"><div class="verif-badge tarik">' + ic('file-x') + '<div><b style="font-size:20px">Tidak terverifikasi</b><div class="small">' + esc(r.message) + '</div></div></div></div>'; return; }
      const d = r.data, sah = d.status === 'SAH';
      out.innerHTML = '<div class="card"><div class="verif-badge ' + (sah ? 'sah' : 'tarik') + '">' + ic(sah ? 'badge-check' : 'circle-alert') + '<div><b style="font-size:22px">' + (sah ? 'DOKUMEN SAH' : 'DOKUMEN DITARIK') + '</b><div class="small">' + (sah ? 'Diterbitkan resmi melalui WORKPLAN dan masih berlaku.' : 'Dokumen ini telah ditarik: ' + esc(d.alasanTarik)) + '</div></div></div>' +
        '<dl class="kv mt-l"><dt>Nomor</dt><dd>' + esc(d.nomor) + '</dd><dt>Judul</dt><dd>' + esc(d.judul) + '</dd><dt>Jenis</dt><dd>' + esc(d.jenis) + '</dd><dt>Diterbitkan</dt><dd>' + fmtTgl(d.terbit, { hari: true, jam: true }) + '</dd><dt>Penerbit</dt><dd>' + esc(d.penerbit) + '</dd><dt>Instansi</dt><dd>' + esc(d.institusi) + (d.unit ? ' — ' + esc(d.unit) : '') + '</dd>' +
        (d.hashPdf ? '<dt>Sidik jari PDF</dt><dd><span class="code">' + esc(d.hashPdf.slice(0, 24)) + '…</span></dd>' : '') + '</dl>' +
        (d.hashPdf ? '<div class="divider"></div><b class="small">Cek isi PDF tidak diubah</b><p class="xs muted" style="margin:4px 0 10px">Pilih berkas PDF yang Anda terima. Pengecekan dilakukan di perangkat Anda, berkas tidak diunggah.</p><input type="file" accept="application/pdf" class="in" data-pdf style="padding-top:12px"><div class="mt" data-pdfres></div>' : '') + '</div>';
      const inp = out.querySelector('[data-pdf]');
      if (inp) inp.onchange = async () => {
        const file = inp.files[0]; if (!file) return;
        const buf = await file.arrayBuffer(), h = await crypto.subtle.digest('SHA-256', buf);
        const hex = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
        out.querySelector('[data-pdfres]').innerHTML = hex === d.hashPdf ? '<div class="info-box ok">' + ic('circle-check') + '<b>Cocok — isi PDF identik dengan yang diterbitkan.</b></div>' : '<div class="info-box bad">' + ic('circle-alert') + '<div><b>Tidak cocok.</b> PDF ini berbeda dari dokumen asli (mungkin sudah diedit, atau berkas versi DOCX/cetak ulang).</div></div>';
      };
    };
    f.onsubmit = e => { e.preventDefault(); const k = f.k.value.trim(); history.replaceState(null, '', '#/v/' + encodeURIComponent(k)); cek(k); };
    if (kode) cek(kode);
  }
});
