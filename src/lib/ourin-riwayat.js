/**
 * ourin-riwayat.js
 * Helper terpusat untuk riwayat hubungan yang berakhir.
 * Dipakai oleh: ps.js, cp_putus.js, putus.js, riwayat.js
 */

import * as timeHelper from './ourin-time.js'

const MAX_RIWAYAT = 10

// ─── Kata-kata per alasan ────────────────────────────────────────────────────

const kataMinggat = [
    'Cinta butuh perhatian — terlalu lama diabaikan, ia pergi mencari yang lebih peduli.',
    'Ia sudah menunggu lama. Kesabaran itu indah, tapi ada batasnya.',
    'Rindu itu seperti lapar: terlalu lama dibiarkan, ia layu sendiri.',
    'Yang pergi bukan karena membenci, tapi karena lelah menunggu yang tak kunjung hadir.',
    'Kadang kehilangan adalah cara paling pahit untuk belajar menghargai kehadiran.',
    'Jarak hati lebih jauh dari jarak fisik — dan kamu sudah terlalu jauh.',
    'Ia tidak meminta banyak, hanya perhatian. Tapi itu pun tak sempat kamu beri.',
    'Cinta tanpa kehadiran adalah lagu tanpa nada — kosong, meski indah di kepala.',
]

const kataPutusSendiri = [
    'Melepaskan bukan tanda kelemahan — justru butuh keberanian untuk jujur pada diri sendiri.',
    'Setiap perpisahan menyimpan pelajaran yang tak bisa dibeli.',
    'Kadang jalan terbaik adalah melangkah sendiri terlebih dahulu.',
    'Mengakhiri yang tidak bahagia adalah awal dari sesuatu yang lebih bermakna.',
    'Bukan salah siapa-siapa. Terkadang dua hati memang menuju arah yang berbeda.',
    'Kehilangan hari ini mungkin adalah pintu menuju yang lebih baik esok hari.',
    'Berani mengakhiri adalah tanda bahwa kamu menghargai dirimu sendiri.',
    'Setelah gelap yang panjang, selalu ada fajar yang menunggu.',
]

const kataDiputusin = [
    'Rasanya berat. Tapi percaya — yang pergi memberi ruang untuk yang lebih baik datang.',
    'Tidak semua cerita berakhir manis, tapi setiap cerita punya maknanya.',
    'Yang meninggalkanmu bukan berarti kamu kurang. Mungkin mereka yang belum cukup siap.',
    'Sakit itu wajar. Tapi jangan biarkan rasa sakit ini jadi tembok untuk cinta berikutnya.',
    'Satu pintu tertutup bukan berarti semua jalan buntu.',
    'Kamu cukup baik — hanya belum bertemu yang tepat.',
    'Perpisahan ini bukan akhir, hanya titik koma dalam cerita hidupmu.',
    'Yang hilang hari ini membuka tangan untuk menyambut yang lebih baik.',
]

function randFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Ambil kata-kata sesuai alasan.
 * @param {'ditinggalkan'|'putus_sendiri'|'diputusin'} alasan
 */
export function kataUntukAlasan(alasan) {
    if (alasan === 'ditinggalkan') return randFrom(kataMinggat)
    if (alasan === 'diputusin')    return randFrom(kataDiputusin)
    return randFrom(kataPutusSendiri)
}

// ─── Simpan ke user ──────────────────────────────────────────────────────────

/**
 * Tambah satu entry ke user.riwayatHubungan[].
 * Simpan terbaru di depan, max MAX_RIWAYAT entry.
 *
 * @param {object} user  — objek user langsung dari db.getUser()
 * @param {{ tipe, pasanganNama, pasanganJid?, mulaiAt?, alasan, kataMoment }} entry
 */
export function addRiwayat(user, entry) {
    if (!Array.isArray(user.riwayatHubungan)) user.riwayatHubungan = []
    user.riwayatHubungan.unshift({
        ...entry,
        berakhirAt: Date.now(),
    })
    if (user.riwayatHubungan.length > MAX_RIWAYAT) {
        user.riwayatHubungan.length = MAX_RIWAYAT
    }
}

// ─── Format untuk ditampilkan ─────────────────────────────────────────────────

/**
 * Format satu entry riwayat menjadi teks WhatsApp-friendly.
 * @param {object} r   — satu entry dari riwayatHubungan[]
 * @param {number} idx — nomor urut (1-based)
 */
export function formatRiwayatEntry(r, idx) {
    const tgl = timeHelper.fromTimestamp(r.berakhirAt, 'dddd, DD MMMM YYYY [pukul] HH:mm')
    const tipe = r.tipe === 'karakter' ? '🎭 Karakter' : '👤 User'

    let durasi = ''
    if (r.mulaiAt && r.berakhirAt > r.mulaiAt) {
        const ms    = r.berakhirAt - r.mulaiAt
        const days  = Math.floor(ms / 86400000)
        const hours = Math.floor((ms % 86400000) / 3600000)
        const mins  = Math.floor((ms % 3600000) / 60000)
        if (days > 0)       durasi = `${days} hari ${hours} jam`
        else if (hours > 0) durasi = `${hours} jam ${mins} menit`
        else                durasi = `${mins} menit`
    }

    const alasanLabel = {
        ditinggalkan : '💔 Ditinggalkan (ditelantarkan)',
        putus_sendiri: '✂️ Putus sendiri',
        diputusin    : '😢 Diputusin pasangan',
    }[r.alasan] || r.alasan

    let txt = `*${idx}.* ${tipe}: *${r.pasanganNama}*\n`
    txt += `   📅 ${tgl}\n`
    if (durasi) txt += `   ⏳ Bersama: ${durasi}\n`
    txt += `   ${alasanLabel}\n`
    txt += `   _"${r.kataMoment}"_`
    return txt
}

/**
 * Format timestamp berakhir untuk pesan real-time di pesan putus.
 */
export function formatWaktuSekarang() {
    return timeHelper.fromTimestamp(Date.now(), 'dddd, DD MMMM YYYY [pukul] HH:mm [WIB]')
}

/**
 * Hitung durasi hubungan dalam teks.
 */
export function formatDurasiHubungan(mulaiAt) {
    if (!mulaiAt) return null
    const ms    = Date.now() - mulaiAt
    const days  = Math.floor(ms / 86400000)
    const hours = Math.floor((ms % 86400000) / 3600000)
    const mins  = Math.floor((ms % 3600000) / 60000)
    if (days > 0)       return `${days} hari ${hours} jam`
    if (hours > 0)      return `${hours} jam ${mins} menit`
    return `${mins} menit`
}
