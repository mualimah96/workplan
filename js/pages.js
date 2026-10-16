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
function chkBtn(kind, id, done, kecil) {
  return '<button class="chk ' + (done ? 'on ok' : '') + (isOwner() ? '' : ' ro') + '" data-act="toggle" data-kind="' + kind + '" data-id="' + esc(id) + '" aria-pressed="' + done + '" aria-label="' + (done ? 'Batalkan selesai' : 'Tandai selesai') + '"' + (kecil ? '' : '') + '><span>' + ic('check') + '</span></button>';
}
/** Baris tugas (Beranda, Kalender, Detail Projek). */
function taskRow(x, o = {}) {
  const now = nowStr(), done = x.status === 'Selesai', telat = !done && x.tenggat && x.tenggat < now;
  const imp = x.prioritas === 'Penting';
  const meta = [];
  if (x.kind === 'ctn') { meta.push(katChip(x.kategori)); meta.push(prioPill(x.prioritas)); }
  else if (x.projek) meta.push('<span class="chip c-biru">' + ic('folder-open') + esc(x.projek.NamaProjek) + '</span>');
  if (x.tenggat) meta.push('<span class="tm ' + (telat ? 'late' : '') + '">' + ic(telat ? 'alarm-clock' : 'clock', 'sm') + (o.tanggal || x.tenggat.slice(0, 10) !== today() ? fmtTgl(x.tenggat, { pendek: true, tanpaTahun: true }) + ', ' : '') + jam(x.tenggat) + ' WIB' + (done && x.rec.SelesaiPada ? ' (tuntas)' : '') + '</span>');
  if (x.kind === 'ctn' && x.projek && !o.tanpaProjek) meta.push('<span class="tm">' + ic('folder-open', 'sm') + esc(x.projek.NamaProjek) + '</span>');
  if (telat) meta.unshift('<span class="badge b-late show-m">' + ic('triangle-alert') + esc(lamaTelat(x.tenggat)) + '</span>');
  let side = '';
  if (done) side = '<span class="badge b-ok hide-m">' + ic('check-check') + 'Selesai</span>';
  else if (telat) side = '<span class="badge b-late hide-m">' + ic('triangle-alert') + esc(lamaTelat(x.tenggat)) + '</span>';
  else if (x.rec.StatusSinkron === 'OK') side = '<span class="badge b-lav hide-m">' + ic('calendar-check') + 'Google Calendar</span>';
  return '<div class="task ' + (done ? 'done' : telat ? 'late' : imp ? 'imp' : '') + (x.rec._p ? ' pending' : '') + '">' + chkBtn(x.kind, x.id, done) +
    '<div class="task-main"><div class="task-title" data-act="buka" data-kind="' + x.kind + '" data-id="' + esc(x.id) + '" style="cursor:pointer">' + esc(x.judul) + '</div><div class="task-meta">' + meta.join('') + '</div></div>' +
    '<div class="task-side">' + side + (isOwner() ? '<button class="icon-btn" data-act="menuItem" data-kind="' + x.kind + '" data-id="' + esc(x.id) + '" aria-label="Menu">' + ic('ellipsis-vertical') + '</button>' : '') + '</div></div>';
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
  if (rec0) { lengket(id + ':done', rec0.Status === 'Selesai'); lengket(id + ':rank', rankCatatan(rec0, nowStr())); lengket(id + ':ikut', true); }
  if (el.dataset.kind === 'ctn') {
    const c = S.ctn.get(id); if (!c) return;
    const done = c.Status === 'Selesai', baru = done ? (c._sebelum || 'Belum') : 'Selesai';
    el.classList.toggle('on', !done); el.classList.toggle('ok', !done);
    Outbox.push('catatan.status', { ID: id, Status: baru });
    if (!done) toast('Ditandai selesai 🎉', 'ok', { sub: c.Judul, aksi: 'Batalkan', fn: () => Outbox.push('catatan.status', { ID: Outbox.idMap[id] || id, Status: c.Status }) });
  } else {
    const t = S.tgs.get(id); if (!t) return;
    const done = t.Status === 'Selesai';
    el.classList.toggle('on', !done);
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
   BERANDA — Ringkasan Hari Ini
   ===================================================================== */
page('beranda', {
  judul: 'Beranda',
  render(el) {
    if (!el._built) {
      el.innerHTML = '<div data-part="hero"></div><div data-part="alert"></div><div class="kpi-row" data-part="kpi"></div>' +
        '<div class="dash-grid"><div class="stack l" style="gap:var(--gut)"><section class="card"><div data-part="th"></div><div class="tlist" data-part="tl"></div>' +
        '<form class="quick-add" data-qa><span class="muted">' + ic('circle-plus') + '</span><input name="q" maxlength="120" placeholder="+ Tambah tugas cepat untuk hari ini…" aria-label="Tambah tugas cepat" autocomplete="off"><button class="btn btn-primary sm">Tambah</button></form></section>' +
        '<div data-part="tips"></div></div><div class="stack l" style="gap:var(--gut)"><section class="card" data-part="hp"></section><section class="card" data-part="pj"></section></div></div>';
      el._built = 1;
      el.querySelector('[data-qa]').onsubmit = e => {
        e.preventDefault();
        const inp = e.target.q, judul = inp.value.trim();
        if (!judul) { inp.focus(); return; }
        const td = today(), jamC = S.set.JAM_TUGAS_CEPAT || '16:00';
        let tg = td + ' ' + jamC; if (tg <= nowStr()) tg = td + ' 23:00';
        Outbox.push('catatan.save', { ID: tmpId(), Judul: judul, Kategori: (kategoriList().find(k => k.nama === 'Lainnya') || kategoriList()[0]).nama, Tenggat: tg, TanggalHariPenting: '', Prioritas: 'Biasa', Status: 'Belum', CatatanTambahan: '', ProjekID: '' });
        inp.value = ''; toast('Tugas ditambahkan', 'ok', { sub: 'Tenggat ' + jam(tg) + ' WIB • tersinkron ke kalender' });
      };
    }
    const now = nowStr(), td = today(), owner = isOwner();
    const items = itemGabungan();
    const hariIni = items.filter(x => x.tenggat && x.tenggat.slice(0, 10) === td).sort(byTenggat);
    const telatLalu = items.filter(x => x.tenggat && x.tenggat.slice(0, 10) < td && (x.status !== 'Selesai' || (x.rec.SelesaiPada || '').slice(0, 10) === td || nilaiLengket(x.id + ':ikut', false))).sort(byTenggat);
    const daftar = telatLalu.concat(hariIni);
    const selesaiHI = hariIni.filter(x => x.status === 'Selesai').length;
    const telat = items.filter(x => x.status !== 'Selesai' && x.tenggat && x.tenggat < now).sort(byTenggat);
    const batas3 = addDays(td, 3) + ' 23:59';
    const tempo = items.filter(x => x.status !== 'Selesai' && x.tenggat >= now && x.tenggat <= batas3);
    const hp = hariPentingList(td, addDays(td, 90));
    const prjAktif = [...S.prj.values()].filter(p => p.Status !== 'Selesai').sort((a, b) => (a.TanggalAcara < b.TanggalAcara ? -1 : 1));
    const persen = pct(selesaiHI, hariIni.length), target = +S.set.TARGET_PERSEN || 75;
    const nama = S.set.NAMA_ADMIN || 'Admin';
    const sisaHI = hariIni.length - selesaiHI;

    const h1 = hp[0];
    part(el, 'hero', '<section class="hero"><div><div class="pills"><span class="pill">' + ic('calendar', 'sm') + fmtTgl(td, { hari: true }) + '</span>' +
      (owner ? '<span class="pill lav hide-m">' + ic('zap', 'sm') + 'Mode Pemilik Aktif</span>' : '<span class="pill hide-m">' + ic('eye', 'sm') + 'Mode Lihat Saja</span>') +
      '<span class="pill">' + (S.kal.aktif !== false && S.set.KALENDER_AKTIF !== 'TIDAK' ? '<i class="dot ok"></i>G-Calendar HP Terhubung' : '<i class="dot warn"></i>Kalender nonaktif') + '</span></div>' +
      '<h1>' + sapaan() + ', ' + esc(nama) + '! 👋</h1>' +
      '<p>Hari ini ada <b>' + hariIni.length + ' tugas</b>' + (hariIni.length ? ' (' + (sisaHI ? sisaHI + ' belum selesai' : 'semua sudah selesai 🎉') + ')' : '') + (telat.length ? ' dan <b style="color:var(--late)">' + telat.length + ' terlambat</b>' : '') + '. Semua jadwal dan pengingat otomatis tersinkron ke Google Kalender ponsel Anda.</p>' +
      '<div class="acts">' + (owner ? '<a class="btn btn-primary" href="#/catatan/baru">' + ic('square-pen') + '+ Tambah Catatan Baru</a><button class="btn btn-white" data-act="sinkronUlang">' + ic('refresh-cw') + 'Sinkron Ulang</button>'
        : '<button class="btn btn-primary" data-act="login">' + ic('lock') + 'Masuk Pemilik</button><a class="btn btn-white" href="#/laporan">' + ic('chart-column') + 'Lihat Laporan</a>') + '</div></div>' +
      '<div class="hero-art" aria-hidden="true">' + (h1 ? '<div class="float f1"><div class="fi" style="background:#EFE9FE;color:#7C3AED">' + ic('megaphone') + '</div><div>' + esc(h1.judul.length > 26 ? h1.judul.slice(0, 25) + '…' : h1.judul) + '<small style="color:#6B38D4">' + esc(relHari(h1.tgl)) + '</small></div></div>' : '') +
      '<div class="orb"><div class="in-orb"><div>' + ic('badge-check') + selesaiHI + ' / ' + hariIni.length + ' Rampung</div></div></div>' +
      (telat.length ? '<div class="float f2"><div class="fi" style="background:#FEE2E2;color:#DC2626">' + ic('bell-ring') + '</div><div>' + telat.length + ' Tugas Terlambat<small style="color:#DC2626">Segera tindak lanjuti</small></div></div>'
        : '<div class="float f2"><div class="fi" style="background:#DCFCE7;color:#16A34A">' + ic('party-popper') + '</div><div>Semua on track<small style="color:#16A34A">Tidak ada yang terlambat</small></div></div>') + '</div></section>');

    part(el, 'alert', telat.length ? '<section class="alert-late card mt" style="background:#FEE2E2;border-color:#FBC9C9;flex-direction:column;gap:8px;box-shadow:none"><div class="row between"><b style="color:var(--late);display:flex;gap:8px;align-items:center">' + ic('circle-alert') + telat.length + ' Tugas Terlambat!</b><span class="badge" style="background:#DC2626;color:#fff">Segera</span></div>' +
      '<div class="small" style="color:#7F1D1D">' + esc(telat[0].judul) + ' (Tenggat: ' + fmtTgl(telat[0].tenggat, { pendek: true, tanpaTahun: true }) + ', ' + jam(telat[0].tenggat) + ' WIB)</div>' +
      '<div style="text-align:right"><button class="btn sm" style="background:#B91C1C;color:#fff" data-act="buka" data-kind="' + telat[0].kind + '" data-id="' + esc(telat[0].id) + '">Kerjakan Sekarang ' + ic('arrow-right', 'sm') + '</button></div></section>' : '');

    const onTrack = !telat.length && (persen >= target || !hariIni.length || sisaHI === hariIni.length && now.slice(11) < '12:00');
    part(el, 'kpi',
      '<div class="card kpi kpi-prog">' + ringSvg(persen, { size: 104, stroke: 11, sub: 'SELESAI', font: 26 }) + '<div style="min-width:0;flex:1"><span class="ontrack ' + (onTrack ? '' : 'no') + '">' + (onTrack ? 'On Track ' + ic('target', 'sm') : 'Perlu Fokus ' + ic('zap', 'sm')) + '</span><div class="h3" style="margin-top:6px">Progres Hari Ini</div><div class="muted small">' + selesaiHI + ' dari ' + hariIni.length + ' tugas telah selesai dikerjakan.</div><div class="bar mt" style="margin-top:10px"><i style="width:' + persen + '%"></i></div></div></div>' +
      kpiCard('Tugas Hari Ini', hariIni.length, sisaHI + ' tugas menunggu', 'list-checks', 'c-biru', '#/catatan', 'hariIni') +
      kpiCard('Jatuh Tempo', tempo.length, 'Dalam 3 hari ke depan', 'clock', 'c-oranye', '#/catatan', 'tempo') +
      kpiCard('Terlambat', telat.length, telat.length ? '<span class="badge b-late" style="height:22px;font-size:12.5px">Perlu dicek!</span>' : 'Aman 👍', 'circle-alert', 'c-' + (telat.length ? 'pink' : 'hijau'), '#/catatan', 'terlambat', telat.length ? 'color:var(--late)' : '') +
      kpiCard('Hari Penting', hp.filter(x => x.tgl <= addDays(td, 30)).length, '30 hari ke depan', 'star', 'c-ungu', '#/kalender'));

    const tab = S.ui.bTab || 'semua';
    const n = { semua: daftar.length, menunggu: daftar.filter(x => x.status !== 'Selesai').length, selesai: daftar.filter(x => x.status === 'Selesai').length };
    part(el, 'th', '<div class="card-head" style="flex-wrap:wrap"><div class="ttl"><h2 class="h2">Tugas Hari Ini</h2><span class="badge b-run">' + hariIni.length + ' Tugas</span></div>' +
      '<div class="seg" role="tablist">' + [['semua', 'Semua'], ['menunggu', 'Menunggu'], ['selesai', 'Selesai']].map(([k, l]) => '<button role="tab" class="' + (tab === k ? 'on' : '') + '" data-act="bTab" data-k="' + k + '">' + l + ' (' + n[k] + ')</button>').join('') + '</div></div>');
    const sd = x => nilaiLengket(x.id + ':done', x.status === 'Selesai');
    const tampil = daftar.filter(x => tab === 'semua' || (tab === 'selesai' ? x.status === 'Selesai' : x.status !== 'Selesai'))
      .sort((a, b) => sd(a) - sd(b) || byTenggat(a, b));
    part(el, 'tl', tampil.length ? tampil.map(x => taskRow(x)).join('') : kosong(tab === 'selesai' ? 'circle-check' : 'party-popper', tab === 'selesai' ? 'Belum ada yang selesai' : 'Tidak ada tugas untuk hari ini', owner ? 'Tambahkan tugas cepat di bawah atau buat catatan baru.' : 'Pemilik belum menjadwalkan tugas hari ini.'));
    el.querySelector('[data-qa]').hidden = !owner;

    const tips = ['Rilis flayer sebelum pukul 11:00 WIB untuk impresi tertinggi di beranda Instagram mahasiswa.', 'Jadwalkan konten hari penting minimal H-3 agar ada waktu revisi dari pimpinan.', 'Gunakan kategori yang konsisten agar laporan bulanan rapi saat ditunjukkan ke atasan.', 'Centang tugas segera setelah selesai — progres & grafik laporan ikut diperbarui otomatis.', 'Bagikan link aplikasi ke atasan: mereka bisa melihat laporan tanpa bisa mengubah data.'];
    part(el, 'tips', '<div class="tips"><div class="ti">' + ic('lightbulb') + '</div><div class="small" style="flex:1"><b>Tips Admin:</b> ' + tips[+td.slice(8, 10) % tips.length] + '</div><a class="link" href="#/laporan">Lihat Tren</a></div>');

    const q = 'Q' + Math.ceil(+td.slice(5, 7) / 3) + ' ' + td.slice(0, 4);
    part(el, 'hp', '<div class="card-head"><div class="ttl">' + ic('calendar-clock', 'lg') + '<h2 class="h3">Hari Penting Terdekat</h2></div><span class="muted xs b">' + q + '</span></div>' +
      (hp.length ? hp.slice(0, 3).map(h => '<div class="hp"><div class="datebox ' + (diffHari(td, h.tgl) <= 1 ? '' : 'soft') + '"><b>' + +h.tgl.slice(8, 10) + '</b><small>' + BLN[+h.tgl.slice(5, 7) - 1].toUpperCase() + '</small></div><div style="min-width:0;flex:1"><span class="badge ' + (diffHari(td, h.tgl) <= 1 ? 'b-late' : 'b-lav') + '" style="height:22px;font-size:12.5px">' + (diffHari(td, h.tgl) === 1 ? 'Besok! (H-1)' : diffHari(td, h.tgl) === 0 ? 'Hari ini!' : diffHari(td, h.tgl) + ' hari lagi') + '</span><div class="hp-t" style="margin-top:4px">' + esc(h.judul) + '</div><div class="hp-s">' + esc(h.sub || '') + '</div></div>' + (h.jenis === 'projek' ? ic('flag', 'sm') : ic('star', 'sm')) + '</div>').join('')
        : kosong('calendar-check', 'Belum ada hari penting', 'Isi "Tanggal Hari Penting" saat membuat catatan.')) +
      '<div style="text-align:center;margin-top:14px"><a class="link" href="#/kalender">Buka Kalender Kampus ' + ic('arrow-right', 'sm') + '</a></div>');

    part(el, 'pj', '<div class="card-head"><div class="ttl">' + ic('folder-open', 'lg') + '<h2 class="h3">Projek &amp; Event Berjalan</h2></div><i class="dot"></i></div>' +
      (prjAktif.length ? prjAktif.slice(0, 3).map(p => { const g = progres(p.ProjekID); return '<a class="prj-mini" href="#/projek/' + esc(p.ProjekID) + '" style="display:block;color:inherit"><div class="row between top"><b style="font-size:16px">' + esc(p.NamaProjek) + '</b>' + (p.Status === 'Berjalan' ? '<span class="badge b-run" style="height:22px;font-size:12px">Berjalan</span>' : '<span class="badge b-warn" style="height:22px;font-size:12px">Persiapan</span>') + '</div>' +
        '<div class="row between small" style="margin:8px 0"><span class="muted">Hari-H: ' + fmtTgl(p.TanggalAcara, { pendek: true }) + ' (' + hMinus(p.TanggalAcara) + ')</span><b style="color:' + (p.Status === 'Berjalan' ? 'var(--primary)' : 'var(--warn)') + '">' + g.selesai + '/' + g.total + ' (' + fmtPct(g.persen) + '%)</b></div>' +
        '<div class="bar" style="--bc:' + (p.Status === 'Berjalan' ? 'var(--primary)' : '#F59E0B') + '"><i style="width:' + g.persen + '%"></i></div></a>'; }).join('')
        : kosong('rocket', 'Belum ada projek berjalan', 'Projek seperti Wisuda atau Bagi Sembako tampil di sini.')) +
      '<div class="row between" style="margin-top:14px"><a class="link" href="#/projek">Lihat Semua Projek ' + ic('arrow-right', 'sm') + '</a>' + (owner ? '<button class="icon-btn sq" data-act="projekBaru" aria-label="Projek baru">' + ic('plus') + '</button>' : '') + '</div>');
  }
});
function kpiCard(lbl, val, sub, ikon, warna, href, chip, gaya) {
  return '<button class="card kpi hov" data-act="kpiGo" data-href="' + href + '" data-chip="' + (chip || '') + '"><div class="k-top"><span class="k-lbl">' + lbl + '</span><span class="k-ic ' + warna + '">' + ic(ikon) + '</span></div><div class="k-val num" style="' + (gaya || '') + '">' + val + '</div><div class="k-sub">' + sub + '</div></button>';
}
Aksi.kpiGo = el => { if (el.dataset.chip) { S.ui.cf = Object.assign({}, S.ui.cf, { chip: el.dataset.chip, hal: 1 }); } go(el.dataset.href); };
Aksi.bTab = el => { S.ui.bTab = el.dataset.k; Store.set('ui', S.ui); emit(); };
Aksi.login = () => openLogin();
Aksi.projekBaru = () => formProjek();

/* =====================================================================
   CATATAN HARIAN — daftar, cari, filter, kartu
   ===================================================================== */
function filterCatatan() {
  const f = S.ui.cf, now = nowStr(), td = today(), q = (f.q || '').toLowerCase().trim();
  const sen = addDays(td, -((dow(td) + 6) % 7)), min = addDays(sen, 6), b3 = addDays(td, 3) + ' 23:59';
  const dasar = semuaCatatan().filter(c => {
    if (q && (c.Judul + ' ' + c.CatatanTambahan + ' ' + c.ID).toLowerCase().indexOf(q) < 0) return false;
    if (f.kat && c.Kategori !== f.kat) return false;
    if (f.st && (f.st === 'Terlambat' ? !isTelat(c, now) : c.Status !== f.st)) return false;
    if (f.pr && c.Prioritas !== f.pr) return false;
    const t = String(c.Tenggat).slice(0, 10);
    if (f.dari && t < f.dari) return false;
    if (f.sampai && t > f.sampai) return false;
    return true;
  });
  const uji = {
    semua: () => true, hariIni: c => c.Tenggat.slice(0, 10) === td, minggu: c => { const t = c.Tenggat.slice(0, 10); return t >= sen && t <= min; },
    tempo: c => c.Status !== 'Selesai' && c.Tenggat >= now && c.Tenggat <= b3, terlambat: c => isTelat(c, now), selesai: c => c.Status === 'Selesai'
  };
  const n = {}; Object.keys(uji).forEach(k => { n[k] = dasar.filter(uji[k]).length; });
  const fn = uji[f.chip] || uji.semua;
  const rank = c => nilaiLengket(c.ID + ':rank', rankCatatan(c, now));
  let list = dasar.filter(fn);
  if (f.urut === 'baru') list.sort((a, b) => (a.DibuatPada < b.DibuatPada ? 1 : -1));
  else if (f.urut === 'judul') list.sort((a, b) => a.Judul.localeCompare(b.Judul, 'id'));
  else list.sort((a, b) => rank(a) - rank(b) || (rank(a) === 3 ? (a.Tenggat < b.Tenggat ? 1 : -1) : (a.Tenggat < b.Tenggat ? -1 : 1)));
  return { list, n };
}
function rankCatatan(c, now) { return isTelat(c, now) ? 0 : c.Status === 'Sedang Dikerjakan' ? 1 : c.Status === 'Belum' || c.Status === undefined ? 2 : 3; }
function ctnCard(c) {
  const now = nowStr(), telat = isTelat(c, now), done = c.Status === 'Selesai', owner = isOwner();
  const p = c.ProjekID ? S.prj.get(c.ProjekID) : null;
  const hpProj = p && p.TanggalAcara === c.TanggalHariPenting;
  return '<article class="card ctn-card hov ' + (telat ? 'late' : '') + (done ? ' done' : '') + '">' +
    '<div class="row wrap" style="gap:8px">' + chkBtn('ctn', c.ID, done) + katChip(c.Kategori) + prioPill(c.Prioritas) + '<span style="margin-left:auto">' + (done ? '<span class="badge b-lav">' + ic('check-check') + 'Selesai</span>' : c.Status === 'Belum' && !telat ? '<span class="badge b-idle">Belum</span>' : '') + '</span></div>' +
    (telat || c.Status === 'Sedang Dikerjakan' ? '<div class="row wrap" style="gap:8px">' + (telat ? '<span class="badge b-late">! ' + esc(lamaTelat(c.Tenggat)) + '</span>' : '') + (c.Status === 'Sedang Dikerjakan' ? '<span class="badge b-run">Sedang Dikerjakan</span>' : '') + '</div>' : '') +
    '<h3 class="ctn-t" data-act="buka" data-kind="ctn" data-id="' + esc(c.ID) + '" style="cursor:pointer">' + esc(c.Judul) + '</h3>' +
    (done ? '<div class="ctn-line ok">' + ic('circle-check', 'sm') + 'Selesai pada: ' + fmtTgl(c.SelesaiPada || c.Tenggat, { hari: true, pendek: true, jam: true }) + '</div>'
      : '<div class="ctn-line ' + (telat ? 'late' : '') + '">' + ic(telat ? 'alarm-clock' : 'clock', 'sm') + 'Tenggat: ' + fmtTgl(c.Tenggat, { hari: true, pendek: true, jam: true }) + '</div>') +
    (c.TanggalHariPenting ? '<div class="ctn-line prj">' + ic('calendar-check', 'sm') + (hpProj ? 'Terkait Hari Penting: ' + esc(p.NamaProjek) + ' (' + fmtTgl(c.TanggalHariPenting, { pendek: true, tanpaTahun: true }) + ')' : 'Hari Penting: ' + fmtTgl(c.TanggalHariPenting, { hari: true, pendek: true, tanpaTahun: true }) + ' (' + relHari(c.TanggalHariPenting) + ')') + '</div>' : '') +
    (p && !hpProj ? '<div class="ctn-line prj">' + ic('folder-open', 'sm') + 'Projek: ' + esc(p.NamaProjek) + '</div>' : '') +
    (c.CatatanTambahan ? '<div class="ctn-note clamp3">' + esc(c.CatatanTambahan) + '</div>' : '') +
    '<div class="ctn-foot">' + syncTag(c) + (owner ? '<span class="row" style="gap:4px"><a class="btn btn-soft sm" href="#/catatan/ubah/' + esc(c.ID) + '">Ubah</a><button class="btn btn-ghost sm" style="color:var(--late)" data-act="hapusCtn" data-id="' + esc(c.ID) + '">Hapus</button></span>' : '<span class="xs faint">' + esc(c.ID) + '</span>') + '</div></article>';
}
Aksi.hapusCtn = el => hapusCatatan(el.dataset.id);
const PER_HAL = 12;
page('catatan', {
  judul: 'Catatan Harian',
  render(el, sub, arg) {
    if (sub === 'baru' || sub === 'ubah') return Pages.catatanForm.render(el, sub, arg, S.route.args[2]);
    const sig = kategoriList().map(k => k.nama).join('|') + isOwner();
    el._statis = false;
    if (el._sig !== sig || el._mode !== 'list') {
      el._mode = 'list'; el._sig = sig;
      const f = S.ui.cf;
      el.innerHTML = '<div class="page-head"><div><h1 class="h1">Catatan Harian</h1><p class="lead">Kelola seluruh tugas dan catatan kerja harian admin medsos kampus. Semua catatan bertenggat otomatis masuk ke Google Kalender.</p></div>' +
        '<div class="acts"><span class="pill">' + (S.set.KALENDER_AKTIF === 'TIDAK' ? '<i class="dot warn"></i>Kalender nonaktif' : '<i class="dot ok pulse"></i>' + ic('calendar-check', 'sm') + 'Google Kalender Tersinkron (Otomatis)') + '</span>' +
        (isOwner() ? '<a class="btn btn-primary" href="#/catatan/baru">' + ic('plus') + 'Tambah Catatan Baru</a>' : '') + '</div></div>' +
        '<div class="grid g4" data-part="kpi"></div>' +
        '<section class="card mt-l"><div class="filterbar"><div class="search search-f" style="max-width:none"><span>' + ic('search') + '</span><input class="in" style="border-radius:12px;padding-left:44px" data-f="q" value="' + esc(f.q) + '" placeholder="Cari berdasarkan judul atau catatan…" aria-label="Cari catatan"></div>' +
        '<select class="sel" data-f="kat" aria-label="Kategori"><option value="">Semua Kategori</option>' + kategoriList().map(k => '<option ' + (f.kat === k.nama ? 'selected' : '') + '>' + esc(k.nama) + '</option>').join('') + '</select>' +
        '<select class="sel" data-f="st" aria-label="Status"><option value="">Semua Status</option>' + ['Belum', 'Sedang Dikerjakan', 'Selesai', 'Terlambat'].map(s => '<option ' + (f.st === s ? 'selected' : '') + '>' + s + '</option>').join('') + '</select>' +
        '<select class="sel" data-f="pr" aria-label="Prioritas"><option value="">Semua Prioritas</option>' + ['Penting', 'Biasa'].map(s => '<option ' + (f.pr === s ? 'selected' : '') + '>' + s + '</option>').join('') + '</select>' +
        '<button class="btn btn-ghost sm" data-act="resetFilter">' + ic('rotate-ccw', 'sm') + 'Reset Filter</button></div>' +
        '<div class="row wrap mt" style="gap:10px"><div class="row wrap" style="gap:6px;flex:1 1 300px"><span class="xs muted b">Rentang</span><input type="date" class="in sm" style="flex:1;min-width:130px;width:auto" data-f="dari" value="' + esc(f.dari) + '" aria-label="Dari tanggal"><span class="muted">–</span><input type="date" class="in sm" style="flex:1;min-width:130px;width:auto" data-f="sampai" value="' + esc(f.sampai) + '" aria-label="Sampai tanggal"></div>' +
        '<select class="sel sm" style="width:auto;flex:0 1 auto;margin-left:auto" data-f="urut" aria-label="Urutkan"><option value="tenggat" ' + (f.urut === 'tenggat' ? 'selected' : '') + '>Urut: Tenggat terdekat</option><option value="baru" ' + (f.urut === 'baru' ? 'selected' : '') + '>Urut: Terbaru dibuat</option><option value="judul" ' + (f.urut === 'judul' ? 'selected' : '') + '>Urut: Judul A–Z</option></select></div>' +
        '<div class="chips-scroll mt" data-part="chips"></div></section>' +
        '<div data-part="arsip"></div><div class="ctn-grid mt-l" data-part="list"></div><div class="card pad-s pager mt" data-part="pager"></div>' +
        '<div class="tips"><div class="ti">' + ic('lightbulb') + '</div><div class="small"><b>Tip Admin:</b> Setiap perubahan judul dan tenggat langsung disinkronkan ke kalender HP tanpa perlu simpan ganda.</div></div>';
      const upd = debounce(() => { S.ui.cf.hal = 1; Store.set('ui', S.ui); this.render(el); }, 200);
      el.querySelectorAll('[data-f]').forEach(inp => {
        inp.addEventListener(inp.tagName === 'INPUT' && inp.type !== 'date' ? 'input' : 'change', () => {
          S.ui.cf[inp.dataset.f] = inp.value; upd();
          if ((inp.dataset.f === 'dari') && inp.value && inp.value < S.dari) pastikanRentang(inp.value, S.ui.cf.sampai || S.dari);
        });
      });
    }
    const { list, n } = filterCatatan(), f = S.ui.cf, now = nowStr();
    const semua = semuaCatatan();
    const proses = semua.filter(c => c.Status === 'Sedang Dikerjakan').length, sel = semua.filter(c => c.Status === 'Selesai').length, tl = semua.filter(c => isTelat(c, now)).length;
    part(el, 'kpi',
      kpiCard('Total Catatan', semua.length, ic('calendar', 'sm') + ' Sejak ' + fmtTgl(S.dari, { pendek: true }), 'list', 'c-biru', '#/catatan', 'semua') +
      kpiCard('Dalam Progres', proses, 'Sedang dikerjakan', 'hourglass', 'c-pink', '#/catatan', 'semua') +
      kpiCard('Selesai', sel, fmtPct(pct(sel, semua.length)) + '% dari semua catatan', 'circle-check', 'c-ungu', '#/catatan', 'selesai') +
      kpiCard('Terlambat', tl, tl ? '<span style="color:var(--late)">Segera selesaikan</span>' : 'Tidak ada', 'alarm-clock', 'c-pink', '#/catatan', 'terlambat', tl ? 'color:var(--late)' : ''));
    part(el, 'chips', [['semua', 'Semua'], ['hariIni', 'Hari Ini'], ['minggu', 'Minggu Ini'], ['tempo', 'Jatuh Tempo'], ['terlambat', 'Terlambat'], ['selesai', 'Selesai']]
      .map(([k, l]) => '<button class="fchip ' + (f.chip === k ? 'on' : '') + '" data-act="chip" data-k="' + k + '">' + (k === 'terlambat' ? '<i class="dot bad"></i>' : '') + l + ' <span class="n">(' + n[k] + ')</span></button>').join(''));
    const butuhArsip = f.dari && f.dari < S.dari;
    part(el, 'arsip', !butuhArsip && S.dari ? '<div class="row mt small muted" style="justify-content:center;gap:8px">' + ic('history', 'sm') + 'Menampilkan catatan sejak ' + fmtTgl(S.dari, { pendek: true }) + ' + semua yang belum selesai. <button class="link" data-act="muatLama">Muat 3 bulan sebelumnya</button></div>' : '');
    const total = list.length, hal = clamp(f.hal || 1, 1, Math.max(1, Math.ceil(total / PER_HAL)));
    const potong = list.slice((hal - 1) * PER_HAL, hal * PER_HAL);
    part(el, 'list', potong.length ? potong.map(ctnCard).join('') : '<div class="card" style="grid-column:1/-1">' + kosong('search', 'Tidak ada catatan yang cocok', 'Coba ubah kata kunci atau filter.', isOwner() ? '<a class="btn btn-soft mt" href="#/catatan/baru">' + ic('plus') + 'Buat catatan</a>' : '') + '</div>');
    const nh = Math.max(1, Math.ceil(total / PER_HAL));
    const nomor = []; for (let i = 1; i <= nh; i++) if (i === 1 || i === nh || Math.abs(i - hal) <= 1) nomor.push(i); else if (nomor[nomor.length - 1] !== '…') nomor.push('…');
    part(el, 'pager', '<span class="small muted">Menampilkan ' + (total ? (hal - 1) * PER_HAL + 1 : 0) + '–' + Math.min(total, hal * PER_HAL) + ' dari ' + total + ' catatan</span><div class="pg"><button data-act="hal" data-h="' + (hal - 1) + '" ' + (hal <= 1 ? 'disabled' : '') + '>' + ic('chevron-left', 'sm') + '</button>' +
      nomor.map(i => i === '…' ? '<span class="muted">…</span>' : '<button class="' + (i === hal ? 'on' : '') + '" data-act="hal" data-h="' + i + '">' + i + '</button>').join('') + '<button data-act="hal" data-h="' + (hal + 1) + '" ' + (hal >= nh ? 'disabled' : '') + '>' + ic('chevron-right', 'sm') + '</button></div>');
  }
});
Aksi.chip = el => { S.ui.cf.chip = el.dataset.k; S.ui.cf.hal = 1; Store.set('ui', S.ui); emit(); };
Aksi.hal = el => { S.ui.cf.hal = +el.dataset.h; emit(); const t = $('.page[data-page="catatan"] [data-part="list"]'); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - 90 }); };
Aksi.resetFilter = () => { S.ui.cf = { q: '', kat: '', st: '', pr: '', dari: '', sampai: '', chip: 'semua', urut: 'tenggat', hal: 1 }; Store.set('ui', S.ui); const el = $('.page[data-page="catatan"]'); el._sig = ''; route(); };
Aksi.muatLama = async el => { const dari = geserBulan(S.dari.slice(0, 7), -3) + '-01'; setBusy(el, true, 'Memuat…'); await pastikanRentang(dari, addDays(S.dari, -1)); S.ui.cf.dari = dari; const pg = $('.page[data-page="catatan"]'); pg._sig = ''; emit(); };

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
  const utama = tt.filter(t => t.Status !== 'Selesai').slice(0, 3);
  const cl = (utama.length < 3 ? tt.filter(t => t.Status === 'Selesai').slice(-(3 - utama.length)) : []).concat(utama);
  return '<article class="card prj-card hov"><div class="row between top"><div class="row wrap" style="gap:6px">' + projekBadge(p.Status) +
    (p.Status !== 'Selesai' ? '<span class="badge ' + (n <= 1 ? 'b-late' : 'b-run') + '">' + ic('alarm-clock') + (n === 1 ? 'Hari-H: Besok! (H-1)' : 'Hari-H: ' + hMinus(p.TanggalAcara)) + '</span>' : '') + '</div>' +
    (owner ? '<button class="icon-btn" data-act="menuPrj" data-id="' + esc(p.ProjekID) + '" aria-label="Menu projek">' + ic('ellipsis-vertical') + '</button>' : '') + '</div>' +
    '<h3 class="h3" style="font-size:22px;line-height:1.3"><a href="#/projek/' + esc(p.ProjekID) + '" style="color:inherit">' + esc(p.NamaProjek) + '</a></h3>' +
    '<div class="prj-banner ' + gradProjek(p) + '"><span class="big">' + ic(ikonProjek(p.NamaProjek)) + '</span>' + (p.Lokasi ? '<span class="loc">' + ic('map-pin', 'sm') + '<span>' + esc(p.Lokasi) + '</span></span>' : '') + '</div>' +
    '<div class="row between small"><span class="row" style="gap:6px;font-weight:700">' + ic('calendar', 'sm') + fmtTgl(p.TanggalAcara) + '</span><span class="muted">' + (p.JamAcara ? esc(p.JamAcara.replace('-', ' – ')) + ' WIB' : 'Seharian') + '</span></div>' +
    (p.Deskripsi ? '<div class="muted small clamp2">' + esc(p.Deskripsi) + '</div>' : '') +
    '<div class="prog-box"><div class="row between"><b>Progress Tugas</b><b style="color:' + (g.persen >= 100 ? '#16A34A' : 'var(--primary)') + '">' + fmtPct(g.persen) + '% Selesai</b></div><div class="bar" style="margin:8px 0;--bc:' + (p.Status === 'Persiapan' ? '#7C3AED' : g.persen >= 100 ? '#16A34A' : 'var(--primary)') + '"><i style="width:' + g.persen + '%"></i></div><div class="row between xs muted"><span>' + g.selesai + ' dari ' + g.total + ' tugas tuntas</span><span>' + (g.total - g.selesai) + ' tersisa</span></div></div>' +
    (cl.length ? '<div><div class="xs b muted" style="letter-spacing:.06em;margin-bottom:4px">CHECKLIST UTAMA</div>' + cl.map(t => '<div class="cl-item ' + (t.Status === 'Selesai' ? 'done' : '') + '">' + chkBtn('tgs', t.TugasID, t.Status === 'Selesai') + '<span class="cl-t">' + esc(t.NamaTugas) + '</span>' + (t.Status === 'Selesai' ? '<span class="xs" style="color:#6B38D4;font-weight:700">Selesai</span>' : t.Tenggat ? '<span class="badge ' + (isTelat(t) ? 'b-late' : 'b-idle') + '" style="height:22px;font-size:12px">' + fmtTgl(t.Tenggat, { pendek: true, tanpaTahun: true }) + '</span>' : '') + '</div>').join('') + '</div>' : '') +
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
  const belum = tt.filter(t => t.Status !== 'Selesai'), sudah = tt.filter(t => t.Status === 'Selesai');
  const baris = t => '<div class="task ' + (t.Status === 'Selesai' ? 'done' : isTelat(t) ? 'late' : '') + (t._p ? ' pending' : '') + '">' + chkBtn('tgs', t.TugasID, t.Status === 'Selesai') + '<div class="task-main"><div class="task-title">' + esc(t.NamaTugas) + '</div><div class="task-meta">' + (t.Tenggat ? '<span class="tm ' + (isTelat(t) ? 'late' : '') + '">' + ic(isTelat(t) ? 'alarm-clock' : 'clock', 'sm') + 'Tenggat ' + fmtTgl(t.Tenggat, { pendek: true, jam: true }) + '</span>' : '<span class="tm">Tanpa tenggat</span>') + (t.Status === 'Selesai' && t.SelesaiPada ? '<span class="tm">' + ic('circle-check', 'sm') + 'Selesai ' + fmtTgl(t.SelesaiPada, { pendek: true, tanpaTahun: true }) + '</span>' : '') + syncTag(t) + '</div></div>' + (owner ? '<button class="icon-btn" data-act="menuItem" data-kind="tgs" data-id="' + esc(t.TugasID) + '" aria-label="Menu tugas">' + ic('ellipsis-vertical') + '</button>' : '') + '</div>';
  part(el, 'hd', '<div class="prj-banner ' + gradProjek(p) + '" style="height:150px;border-radius:0;padding:20px"><span class="big">' + ic(ikonProjek(p.NamaProjek)) + '</span><div style="position:relative"><div class="row wrap" style="gap:6px;margin-bottom:8px">' + projekBadge(p.Status) + (p.Status !== 'Selesai' ? '<span class="badge" style="background:rgba(255,255,255,.9);color:var(--text)">' + ic('alarm-clock') + hMinus(p.TanggalAcara) + '</span>' : '') + '</div><h1 class="h1" style="color:#fff;font-size:30px;line-height:1.2">' + esc(p.NamaProjek) + '</h1></div></div>' +
    '<div style="padding:22px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center"><div class="stack s"><div class="row wrap" style="gap:18px;font-weight:600"><span class="row" style="gap:6px">' + ic('calendar', 'sm') + fmtTgl(p.TanggalAcara, { hari: true }) + (p.JamAcara ? ' • ' + esc(p.JamAcara.replace('-', '–')) + ' WIB' : '') + '</span>' + (p.Lokasi ? '<span class="row" style="gap:6px">' + ic('map-pin', 'sm') + esc(p.Lokasi) + '</span>' : '') + (p.Penyelenggara ? '<span class="row" style="gap:6px">' + ic('users', 'sm') + esc(p.Penyelenggara) + '</span>' : '') + '</div>' +
    (p.TanggalMulai ? '<div class="small muted">Persiapan sejak ' + fmtTgl(p.TanggalMulai) + '</div>' : '') + (p.Deskripsi ? '<p style="margin:4px 0 0">' + esc(p.Deskripsi) + '</p>' : '') + '<div>' + syncTag(p) + '</div></div>' +
    ringSvg(g.persen, { size: 116, stroke: 12, label: g.selesai + '/' + g.total, sub: 'TUGAS', font: 24, color: g.persen >= 100 ? '#16A34A' : '#2F6BFF' }) + '</div>');
  part(el, 'th', '<div class="card-head"><div class="ttl"><h2 class="h3">Checklist Tugas Projek</h2><span class="badge b-run">' + fmtPct(g.persen) + '%</span></div>' + (owner ? '<button class="btn btn-soft sm" data-act="tambahTugas" data-id="' + esc(id) + '">' + ic('plus', 'sm') + 'Tugas</button>' : '') + '</div>');
  part(el, 'tl', tt.length ? belum.map(baris).join('') + (sudah.length ? '<div class="xs b muted" style="margin-top:6px;letter-spacing:.06em">SUDAH SELESAI (' + sudah.length + ')</div>' + sudah.map(baris).join('') : '') : kosong('list-todo', 'Belum ada tugas', 'Pecah projek menjadi tugas-tugas kecil bertenggat.'));
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
    const hari = (map[sel] || []).slice().sort((a, b) => (a.status === 'Selesai') - (b.status === 'Selesai') || byTenggat(a, b));
    const hHari = hp[sel] || [];
    const tabH = S.ui.kalTab || 'semua';
    const hariF = hari.filter(x => tabH === 'semua' || (tabH === 'selesai' ? x.status === 'Selesai' : x.status !== 'Selesai'));
    const semuaBulan = Object.values(map).flat();
    const sb = semuaBulan.filter(x => x.status === 'Selesai').length;
    const mendatang = semuaBulan.filter(x => x.status !== 'Selesai' && x.tenggat >= now).length;
    const perhatian = semuaBulan.filter(x => x.status !== 'Selesai' && x.tenggat < now);
    const panel = '<div class="row between"><span class="badge b-run">' + (sel === td ? '● HARI INI' : relHari(sel)) + '</span><span class="small muted">' + hari.length + ' Agenda</span></div>' +
      '<h2 class="h2" style="margin-top:10px">' + fmtTgl(sel, { hari: true }) + '</h2>' +
      (hHari.length ? '<div class="stack s mt">' + hHari.map(h => '<div class="info-box ' + (h.jenis === 'projek' ? 'bad' : 'warn') + ' small">' + ic(h.jenis === 'projek' ? 'flag' : 'star', 'sm') + '<div><b>' + (h.jenis === 'projek' ? 'Hari-H: ' : 'Hari penting: ') + esc(h.judul) + '</b>' + (h.sub ? '<div class="xs">' + esc(h.sub) + '</div>' : '') + '</div></div>').join('') + '</div>' : '') +
      '<div class="seg full mt">' + [['semua', 'Semua'], ['belum', 'Belum'], ['selesai', 'Selesai']].map(([kk, l]) => '<button class="' + (tabH === kk ? 'on' : '') + '" data-act="kalTab" data-k="' + kk + '">' + l + ' (' + (kk === 'semua' ? hari.length : hari.filter(x => (kk === 'selesai') === (x.status === 'Selesai')).length) + ')</button>').join('') + '</div>' +
      '<div class="stack s mt">' + (hariF.length ? hariF.map(x => '<div class="day-item ' + (x.status === 'Selesai' ? 'done' : '') + '">' + chkBtn(x.kind, x.id, x.status === 'Selesai') + '<div style="flex:1;min-width:0"><div class="row wrap" style="gap:6px;margin-bottom:4px">' + (x.kind === 'ctn' ? katChip(x.kategori) : '<span class="chip c-biru">Tugas Projek</span>') + (x.status !== 'Selesai' && x.tenggat < now ? '<span class="badge b-late" style="height:24px">Terlambat</span>' : x.prioritas === 'Penting' ? '<span class="prio">' + ic('star') + 'Penting</span>' : '') + '</div>' +
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
Aksi.kalTab = el => { S.ui.kalTab = el.dataset.k; emit(); };

/* =====================================================================
   LAPORAN & REKAP BULANAN (grafik SVG, cetak PDF, ekspor CSV)
   ===================================================================== */
page('laporan', {
  judul: 'Laporan & Rekap',
  render(el, ymArg) {
    const L = S.ui.lap = Object.assign({ ym: ymNow(), kat: '' }, S.ui.lap || {});
    if (/^\d{4}-\d{2}$/.test(ymArg || '') && el._arg !== ymArg) { L.ym = ymArg; el._arg = ymArg; }
    const prevYm = geserBulan(L.ym, -1), awalPrev = prevYm + '-01';
    let memuat = false;
    if (S.dari && awalPrev < S.dari) { const key = awalPrev + '_' + (akhirBulan(L.ym) < S.dari ? akhirBulan(L.ym) : addDays(S.dari, -1)); if (S.arsipRng[key] !== S.ver) { memuat = true; pastikanRentang(awalPrev, akhirBulan(L.ym)); } }
    const now = nowStr(), kats = kategoriList().map(k => k.nama);
    const base = { catatan: semuaCatatan(), tugas: [...S.tgs.values()], projek: [...S.prj.values()], now, kategori: kats, filterKategori: L.kat };
    const r = WPStat.rekapBulan(Object.assign({}, base, { ym: L.ym })), rp = WPStat.rekapBulan(Object.assign({}, base, { ym: prevYm }));
    const target = +S.set.TARGET_PERSEN || 75, owner = isOwner();
    const delta = rp.total ? Math.round((r.total - rp.total) / rp.total * 100) : null;
    const bulanOpt = []; for (let i = -12; i <= 2; i++) bulanOpt.push(geserBulan(ymNow(), i));
    if (bulanOpt.indexOf(L.ym) < 0) bulanOpt.unshift(L.ym);
    const puncak = r.perMinggu.reduce((a, b) => (b.tuntas > a.tuntas ? b : a), r.perMinggu[0]);
    const prjPuncak = r.projek.find(p => p.tanggal >= L.ym + '-' + p2(puncak.dari) && p.tanggal <= L.ym + '-' + p2(puncak.sampai));
    const evaluasi = r.total ? 'Pada ' + namaBulan(L.ym) + ' tercatat ' + r.total + ' tugas dengan ' + r.selesai + ' selesai (' + fmtPct(r.persen) + '%), ' + r.tepatWaktu + ' di antaranya tepat waktu. ' + (r.terlambat ? r.terlambat + ' tugas terlambat perlu ditindaklanjuti. ' : 'Tidak ada tugas terlambat. ') + (r.persen >= target ? 'Capaian telah melampaui target minimum ' + target + '%.' : 'Capaian belum memenuhi target ' + target + '%.') : 'Belum ada tugas bertenggat pada periode ini.';
    const kc = { Flayer: '#8B5CF6', 'Konten Medsos': '#EC4899', Rapat: '#16A34A', Lainnya: '#F59E0B' };
    const warnaHex = { ungu: '#8B5CF6', pink: '#EC4899', hijau: '#16A34A', oranye: '#F59E0B', biru: '#2F6BFF', teal: '#14B8A6', kuning: '#EAB308', abu: '#64748B' };
    el.innerHTML = '<div class="page-head"><div><div class="kick"><span class="pill blue" style="height:30px">' + ic('file-text', 'sm') + 'Laporan Kinerja Periode</span><span class="pill" style="height:30px">' + semester(L.ym) + '</span></div><h1 class="h1">Laporan &amp; Rekap Bulanan' + (memuat ? ' ' + ic('loader-circle', 'spin') : '') + '</h1><p class="lead">Evaluasi produktivitas kerja admin medsos, ketercapaian tenggat tugas, dan progres event kampus periode ' + namaBulan(L.ym) + '.</p></div>' +
      '<div class="acts no-print"><select class="sel sm" style="width:auto" data-ym aria-label="Periode">' + bulanOpt.map(y => '<option value="' + y + '" ' + (y === L.ym ? 'selected' : '') + '>' + namaBulan(y) + '</option>').join('') + '</select>' +
      '<select class="sel sm" style="width:auto" data-lk aria-label="Kategori"><option value="">Semua Kategori</option>' + kats.map(k => '<option ' + (L.kat === k ? 'selected' : '') + '>' + esc(k) + '</option>').join('') + '</select>' +
      '<button class="btn btn-white sm" data-act="cetak">' + ic('printer', 'sm') + 'Cetak / Simpan PDF</button><button class="btn btn-primary sm" data-act="eksporCsv">' + ic('download', 'sm') + 'Ekspor Data CSV</button>' +
      '<button class="btn btn-soft sm" data-act="bagikanLap">' + ic('share-2', 'sm') + 'Bagikan</button>' + (owner ? '<a class="btn btn-soft sm" href="#/dokumen/buat/LAPKIN/' + L.ym + '">' + ic('file-badge', 'sm') + 'Dokumen Resmi</a>' : '') + '</div></div>' +
      '<div class="print-only" style="margin-bottom:12px"><b>' + esc(S.set.NAMA_INSTITUSI || '') + ' — ' + esc(S.set.UNIT_KERJA || '') + '</b></div>' +
      '<div class="grid g4">' +
      '<div class="card kpi"><div class="k-top"><span class="k-lbl">TOTAL TUGAS TERDAFTAR</span><span class="k-ic">' + ic('clipboard-list') + '</span></div><div class="k-val">' + r.total + ' <span class="small muted">Tugas</span></div><div class="k-sub">Beban kerja terdaftar bulan ini</div><div class="xs" style="color:' + (delta === null ? 'var(--text-3)' : delta >= 0 ? 'var(--primary)' : 'var(--warn)') + ';font-weight:700">' + ic('trending-up', 'sm') + ' ' + (delta === null ? 'Belum ada data bulan lalu' : rp.total < 5 ? (r.total - rp.total >= 0 ? '+' : '') + (r.total - rp.total) + ' tugas dibanding ' + BULAN[+prevYm.slice(5) - 1] : (delta >= 0 ? '+' : '') + delta + '% dibanding ' + BULAN[+prevYm.slice(5) - 1]) + '</div></div>' +
      '<div class="card kpi"><div class="k-top"><span class="k-lbl">TUGAS SELESAI</span><span class="k-ic c-hijau">' + ic('circle-check') + '</span></div><div class="k-val" style="color:#16A34A">' + r.selesai + ' <span class="small muted">Berhasil</span></div><div class="k-sub">' + fmtPct(r.persen) + '% tingkat penyelesaian • ' + fmtPct(r.persenTepat) + '% tepat waktu</div><div class="xs" style="color:' + (r.persen >= target ? '#16A34A' : 'var(--warn)') + ';font-weight:700">' + ic(r.persen >= target ? 'circle-check' : 'triangle-alert', 'sm') + ' ' + (r.persen >= target ? 'Di atas target bulanan (≥' + target + '%)' : 'Di bawah target ' + target + '%') + '</div></div>' +
      '<div class="card kpi"><div class="k-top"><span class="k-lbl">TUGAS TERLAMBAT</span><span class="k-ic c-pink">' + ic('triangle-alert') + '</span></div><div class="k-val" style="color:var(--late)">' + r.terlambat + ' <span class="small muted">Item</span></div><div class="k-sub">' + r.telatSelesai + ' tuntas terlambat, ' + r.telatTerbuka + ' butuh follow up</div></div>' +
      '<div class="card kpi"><div class="k-top"><span class="k-lbl">INDEKS PRODUKTIVITAS</span><span class="k-ic c-ungu">' + ic('award') + '</span></div><div class="k-val" style="color:#6B38D4">' + fmtPct(r.indeks) + '%</div><div class="k-sub"><b>' + r.predikat + '</b> • 60% penyelesaian + 40% ketepatan waktu</div></div></div>' +
      '<div class="grid mt-l" style="grid-template-columns:minmax(0,1fr) minmax(0,1.5fr)" data-lg>' +
      '<section class="card"><div class="card-head"><div><h2 class="h3">Status Penyelesaian Tugas</h2><div class="xs muted">Komposisi ' + r.total + ' tugas terdata ' + BULAN[+L.ym.slice(5) - 1] + '</div></div><span class="badge b-run">' + namaBulan(L.ym) + '</span></div>' +
      '<div class="donut-wrap">' + donutSvg([{ l: 'Selesai', v: r.selesai, c: '#16A34A' }, { l: 'Proses', v: r.proses, c: '#2F6BFF' }, { l: 'Belum', v: r.belum, c: '#94A3B8' }], { label: fmtPct(r.persen) + '%', sub: 'TINGKAT SELESAI' }) + '</div>' +
      '<div class="legend-box"><div><div class="lb-t"><i style="background:#16A34A"></i>Selesai</div><b>' + r.selesai + '</b><small>' + fmtPct(pct(r.selesai, r.total)) + '%</small></div><div><div class="lb-t"><i style="background:#2F6BFF"></i>Proses</div><b>' + r.proses + '</b><small>' + fmtPct(pct(r.proses, r.total)) + '%</small></div><div><div class="lb-t"><i style="background:#94A3B8"></i>Belum</div><b>' + r.belum + '</b><small>' + fmtPct(pct(r.belum, r.total)) + '%</small></div></div></section>' +
      '<section class="card"><div class="card-head" style="flex-wrap:wrap"><div><h2 class="h3">Tren Penyelesaian Tugas per Minggu</h2><div class="xs muted">Perbandingan tugas tuntas vs dalam proses (' + r.perMinggu.length + ' minggu)</div></div>' + (puncak && puncak.tuntas ? '<span class="badge b-lav">' + ic('trending-up') + 'Puncak di Minggu ' + puncak.minggu + (prjPuncak ? ' (' + esc(prjPuncak.nama.slice(0, 18)) + ')' : '') + '</span>' : '') + '</div>' +
      barsSvg(r.perMinggu.map(m => ({ l: 'Minggu ' + m.minggu, a: m.tuntas, b: m.proses })), { aria: 'Tugas tuntas per minggu' }) +
      '<div class="row between wrap small mt"><span class="row" style="gap:14px"><span class="row" style="gap:6px"><i class="dot" style="background:#2F6BFF"></i>Tugas Tuntas (' + r.selesai + ')</span><span class="row" style="gap:6px"><i class="dot" style="background:#C7D7FE"></i>Dalam Proses / Tertunda (' + (r.total - r.selesai) + ')</span></span><b style="color:var(--primary)">Rata-rata: ' + fmtPct(r.selesai / Math.max(1, r.perMinggu.length)) + ' tugas tuntas / minggu</b></div></section></div>' +
      '<div class="row between mt-l mb"><h2 class="h3 row">' + ic('layers') + 'Performa per Kategori Pekerjaan</h2><span class="xs muted b">Target minimum ketercapaian: ' + target + '%</span></div>' +
      '<div class="grid g4">' + r.perKategori.map(k => { const w = katInfo(k.nama).warna, hex = warnaHex[w] || kc[k.nama] || '#64748B'; return '<div class="card kpi"><div class="row between"><span class="chip c-' + w + '">' + esc(k.nama) + '</span><b style="font-size:22px;color:' + hex + '">' + fmtPct(k.persen) + '%</b></div><div class="small muted">Tugas Selesai: <b style="color:var(--text)">' + k.selesai + ' / ' + k.total + '</b></div><div class="bar" style="--bc:' + hex + '"><i style="width:' + k.persen + '%"></i></div><div class="xs muted">' + (k.total ? (k.persen >= target ? 'Memenuhi target' : (k.total - k.selesai) + ' masih dalam proses') : 'Tidak ada tugas') + '</div></div>'; }).join('') + '</div>' +
      '<section class="card mt-l"><div class="card-head"><div><h2 class="h3 row">' + ic('rocket') + 'Rekap Progres Projek &amp; Event Kampus</h2><div class="xs muted">Daftar agenda strategis berjalan dan realisasi target publikasi</div></div><span class="badge b-run"><i class="dot"></i>' + r.projek.length + ' Projek</span></div>' +
      (r.projek.length ? '<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Nama Projek / Event</th><th>Jadwal Hari-H</th><th style="min-width:200px">Progres Checklist</th><th>Status Projek</th></tr></thead><tbody>' +
        r.projek.map(p => '<tr><td><a href="#/projek/' + esc(p.id) + '" style="color:inherit"><b>' + esc(p.nama) + '</b></a><div class="xs muted">' + esc(p.penyelenggara) + '</div></td><td class="small">' + ic('calendar', 'sm') + ' ' + fmtTgl(p.tanggal, { pendek: true }) + '</td><td><div class="row" style="gap:10px"><span class="xs b" style="color:var(--primary);width:44px">' + Math.round(p.persen) + '%</span><div class="bar" style="flex:1;--bc:' + (p.persen >= 100 ? '#16A34A' : p.status === 'Persiapan' ? '#F59E0B' : 'var(--primary)') + '"><i style="width:' + p.persen + '%"></i></div><span class="xs muted">' + p.selesai + '/' + p.total + '</span></div></td><td>' + projekBadge(p.status) + '</td></tr>').join('') + '</tbody></table></div>' : kosong('folder-open', 'Tidak ada projek pada periode ini', '')) + '</section>' +
      '<section class="card mt-l"><h2 class="h3 row">' + ic('message-square-text') + 'Catatan Evaluasi untuk Pimpinan</h2><div class="eval-box mt">' + esc(evaluasi) + '</div><div class="row between wrap xs muted mt"><span>Kesiapan konten: <b>' + (r.persen >= target ? 'Tinggi' : 'Perlu ditingkatkan') + '</b></span><span>Diperbarui: ' + fmtTgl(now, { pendek: true, jam: true }) + '</span></div></section>' +
      '<section class="card mt-l"><div class="row between wrap"><div><div class="xs b" style="color:var(--primary);letter-spacing:.06em">VERIFIKASI &amp; PERTANGGUNGJAWABAN</div><h2 class="h3">Lembar Pengesahan Laporan Kinerja Bulanan</h2></div><span class="pill">' + ic('map-pin', 'sm') + esc(S.set.KOTA || '') + ', ' + fmtTgl(today()) + '</span></div>' +
      '<div class="sign mt"><div><div class="row between xs"><span class="muted b">Disusun oleh:</span><span class="badge b-ok" style="height:22px;font-size:12px">' + ic('circle-check') + 'Mode Pemilik Terverifikasi</span></div><div class="space">' + esc(S.set.NAMA_ADMIN || '') + '</div><b>' + esc(S.set.JABATAN_ADMIN || '') + '</b><div class="xs muted">NIP / ID: ' + esc(S.set.NIP_ADMIN || '-') + ' • ' + esc(S.set.UNIT_KERJA || '') + '</div></div>' +
      '<div><div class="row between xs"><span class="muted b">Mengetahui &amp; Menyetujui:</span><span class="badge b-run" style="height:22px;font-size:12px">' + ic('shield-check') + 'Dokumen Resmi Workplan</span></div><div class="space">( Ruang Tanda Tangan Basah )</div><b>' + esc(S.set.ATASAN_NAMA || '................................') + '</b><div class="xs muted">' + esc(S.set.ATASAN_JABATAN || '') + (S.set.ATASAN_NIP ? ' • NIP: ' + esc(S.set.ATASAN_NIP) : '') + '</div></div></div>' +
      '<div class="row between wrap xs muted mt"><span>' + ic('cloud', 'sm') + ' Data rekap di-generate otomatis oleh Workplan Campus Engine</span><span>ID Dokumen: WPK-REP-' + L.ym.replace('-', '') + '</span></div></section>';
    el.querySelector('[data-ym]').onchange = e => { L.ym = e.target.value; el._arg = L.ym; Store.set('ui', S.ui); history.replaceState(null, '', '#/laporan/' + L.ym); emit(); };
    el.querySelector('[data-lk]').onchange = e => { L.kat = e.target.value; Store.set('ui', S.ui); emit(); };
    const lg = el.querySelector('[data-lg]'); if (innerWidth < 1100) lg.style.gridTemplateColumns = 'minmax(0,1fr)';
  }
});
Aksi.cetak = () => window.print();
Aksi.eksporCsv = () => {
  const L = S.ui.lap, list = semuaCatatan().filter(c => c.Tenggat.slice(0, 7) === L.ym && (!L.kat || c.Kategori === L.kat)).sort((a, b) => (a.Tenggat < b.Tenggat ? -1 : 1));
  const rows = [['ID', 'Judul', 'Kategori', 'Tenggat', 'Hari Penting', 'Prioritas', 'Status', 'Selesai Pada', 'Terlambat', 'Projek', 'Catatan Tambahan']];
  const now = nowStr();
  list.forEach(c => rows.push([c.ID, c.Judul, c.Kategori, c.Tenggat, c.TanggalHariPenting, c.Prioritas, c.Status, c.SelesaiPada, (isTelat(c, now) || (c.SelesaiPada && c.SelesaiPada > c.Tenggat)) ? 'Ya' : 'Tidak', c.ProjekID ? (S.prj.get(c.ProjekID) || {}).NamaProjek || c.ProjekID : '', c.CatatanTambahan]));
  unduhBlob(new Blob([csvDari(rows)], { type: 'text/csv;charset=utf-8' }), 'Workplan-Rekap-' + L.ym + '.csv');
  toast('CSV diunduh', 'ok', { sub: list.length + ' catatan ' + namaBulan(L.ym) });
};
Aksi.bagikanLap = async () => {
  const url = (S.set.APP_URL || location.origin + location.pathname).split('#')[0] + '#/laporan/' + S.ui.lap.ym;
  const data = { title: 'Laporan Workplan ' + namaBulan(S.ui.lap.ym), text: 'Laporan kinerja admin medsos (mode lihat saja):', url };
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
