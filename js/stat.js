/**
 * js/stat.js — rekap bulanan WORKPLAN (salinan identik backend Statistik.gs).
 * ⚠️ KODE INI IDENTIK dengan backend Statistik.gs agar angka di layar Laporan
 *    sama persis dengan angka di dokumen resmi (Doc Engine). Ubah keduanya bersamaan.
 *
 * Definisi:
 *  - Total      : catatan dengan Tenggat di bulan tsb.
 *  - Selesai    : Status = Selesai. Tepat waktu bila SelesaiPada <= Tenggat.
 *  - Terlambat  : selesai melewati tenggat + belum selesai padahal tenggat sudah lewat.
 *  - Indeks     : 60% × persen selesai + 40% × persen tepat waktu (dari yang selesai).
 */
var WPStat = (function () {
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function hariDalamBulan(ym) {
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }
  function geserBulan(ym, n) {
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + '-' + p2(m + 1);
  }
  function satuDesimal(x) { return Math.round(x * 10) / 10; }
  function predikat(x) { return x >= 85 ? 'Sangat Baik' : x >= 70 ? 'Baik' : x >= 55 ? 'Cukup' : 'Perlu Perhatian'; }
  function progres(projekId, tugas) {
    var t = (tugas || []).filter(function (x) { return x.ProjekID === projekId; });
    var s = t.filter(function (x) { return x.Status === 'Selesai'; }).length;
    return { total: t.length, selesai: s, persen: t.length ? satuDesimal(s / t.length * 100) : 0 };
  }

  /** o = {catatan, tugas, projek, ym:'2026-10', now:'2026-10-24 10:00', kategori:[nama], filterKategori} */
  function rekapBulan(o) {
    var ym = o.ym, now = o.now;
    var list = (o.catatan || []).filter(function (c) {
      return String(c.Tenggat).slice(0, 7) === ym && (!o.filterKategori || c.Kategori === o.filterKategori);
    });
    var r = { ym: ym, total: list.length, selesai: 0, proses: 0, belum: 0, terlambat: 0, telatSelesai: 0, telatTerbuka: 0, tepatWaktu: 0 };
    list.forEach(function (c) {
      if (c.Status === 'Selesai') {
        r.selesai++;
        if (c.SelesaiPada && String(c.SelesaiPada) > String(c.Tenggat)) r.telatSelesai++; else r.tepatWaktu++;
      } else {
        if (c.Status === 'Sedang Dikerjakan') r.proses++; else r.belum++;
        if (String(c.Tenggat) < now) r.telatTerbuka++;
      }
    });
    r.terlambat = r.telatSelesai + r.telatTerbuka;
    r.persen = r.total ? satuDesimal(r.selesai / r.total * 100) : 0;
    r.persenTepat = r.selesai ? satuDesimal(r.tepatWaktu / r.selesai * 100) : 0;
    r.indeks = r.total ? satuDesimal(0.6 * r.persen + 0.4 * r.persenTepat) : 0;
    r.predikat = r.total ? predikat(r.indeks) : '-';

    var names = (o.kategori || []).slice();
    list.forEach(function (c) { if (names.indexOf(c.Kategori) < 0) names.push(c.Kategori); });
    r.perKategori = names.map(function (n) {
      var a = list.filter(function (c) { return c.Kategori === n; });
      var s = a.filter(function (c) { return c.Status === 'Selesai'; }).length;
      return { nama: n, total: a.length, selesai: s, persen: a.length ? satuDesimal(s / a.length * 100) : 0 };
    });

    var hari = hariDalamBulan(ym), nM = Math.ceil(hari / 7);
    r.perMinggu = [];
    for (var w = 0; w < nM; w++) r.perMinggu.push({ minggu: w + 1, dari: w * 7 + 1, sampai: Math.min(hari, w * 7 + 7), tuntas: 0, proses: 0, total: 0 });
    list.forEach(function (c) {
      var d = +String(c.Tenggat).slice(8, 10), m = r.perMinggu[Math.min(nM - 1, Math.floor((d - 1) / 7))];
      m.total++; if (c.Status === 'Selesai') m.tuntas++; else m.proses++;
    });

    var awal = ym + '-01', akhir = ym + '-' + p2(hari);
    r.projek = (o.projek || []).filter(function (p) {
      var mulai = p.TanggalMulai || p.TanggalAcara;
      return (p.TanggalAcara >= awal && p.TanggalAcara <= akhir) || (mulai <= akhir && p.TanggalAcara >= awal) || (p.Status !== 'Selesai' && mulai <= akhir);
    }).sort(function (a, b) { return a.TanggalAcara < b.TanggalAcara ? -1 : 1; }).map(function (p) {
      var g = progres(p.ProjekID, o.tugas);
      return { id: p.ProjekID, nama: p.NamaProjek, tanggal: p.TanggalAcara, status: p.Status, penyelenggara: p.Penyelenggara || '', total: g.total, selesai: g.selesai, persen: g.persen };
    });
    return r;
  }

  return { rekapBulan: rekapBulan, geserBulan: geserBulan, hariDalamBulan: hariDalamBulan, predikat: predikat, progres: progres, p2: p2 };
})();
