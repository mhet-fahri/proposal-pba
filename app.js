// Ganti dengan URL Web App dari deployment Google Apps Script Anda nanti
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyouPJbvPRRQ-oPGu562EJ_F4kKM2U5hc6TF_IzYE0aDJvw1E7GmMMfFHZG6SO-0fJq/exec';

// FUNGSI NAVIGASI TAB
function switchTab(tabName) {
    // Sembunyikan semua konten tab
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
        tab.classList.remove('active');
    });

    // Nonaktifkan semua link navbar
    document.querySelectorAll('.nav-links a:not(.btn-login)').forEach(link => {
        link.classList.remove('active');
    });

    // Tampilkan tab yang dipilih
    document.getElementById('tab-' + tabName).classList.remove('hidden');
    document.getElementById('tab-' + tabName).classList.add('active');

    // Aktifkan link navbar yang sesuai
    event.target.classList.add('active');
}

// LOGIKA FORM PENGAJUAN
const formPengajuan = document.getElementById('form-pengajuan');
if (formPengajuan) {
    formPengajuan.addEventListener('submit', async function (e) {
        e.preventDefault();

        const btnSubmit = document.getElementById('btn-submit');
        const btnText = btnSubmit.querySelector('.btn-text');
        const spinner = document.getElementById('spinner-submit');

        // UI Loading State
        btnSubmit.disabled = true;
        btnText.textContent = "Mengirim...";
        spinner.classList.remove('hidden');

        // Ambil Data File
        const fileInput = document.getElementById('file_draft');
        const file = fileInput.files[0];

        try {
            // Konversi file ke base64
            const base64Data = await getBase64(file);

            // Siapkan payload JSON
            const payload = {
                action: 'submit_pengajuan',
                nama: document.getElementById('nama').value,
                nim: document.getElementById('nim').value,
                semester: document.getElementById('semester').value,
                email: document.getElementById('email').value,
                judul: document.getElementById('judul').value,
                fileName: file.name,
                fileBase64: base64Data
            };

            // Fetch API POST ke GAS (Gunakan no-cors untuk hindari error CORS preflight standar di beberapa browser, 
            // tapi karena kita sudah pasang Headers di GAS, kita coba standard mode dulu. 
            // Alternatif: pakai mode: 'no-cors' tapi resikonya response body ga bisa dibaca)
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                //mode: 'no-cors', // Uncomment ini kalau ada masalah CORS dan ga butuh baca pesan balikan
                body: JSON.stringify(payload)
            });

            // Karena GAS kadang return HTML/Redirect, cara paling aman adalah anggap sukses jika request tidak error
            // Tampilkan Notifikasi Sukses
            formPengajuan.classList.add('hidden');
            document.getElementById('alert-success').classList.remove('hidden');

        } catch (error) {
            console.error("Error:", error);
            alert("Terjadi kesalahan saat mengirim data. Silakan coba lagi. Pastikan ukuran file tidak terlalu besar.");
        } finally {
            // Restore UI
            btnSubmit.disabled = false;
            btnText.textContent = "Kirim Pengajuan";
            spinner.classList.add('hidden');
        }
    });
}

// UTILS: File to Base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// LOGIKA CEK STATUS
const formStatus = document.getElementById('form-status');
if (formStatus) {
    formStatus.addEventListener('submit', async function (e) {
        e.preventDefault();
        const nim = document.getElementById('search-nim').value;
        const btnSearch = document.getElementById('btn-search');
        const resultContainer = document.getElementById('status-result');

        btnSearch.textContent = "Mencari...";
        btnSearch.disabled = true;

        try {
            // Panggil GET API GAS
            const response = await fetch(`${SCRIPT_URL}?action=status&nim=${nim}`);
            const json = await response.json();

            resultContainer.innerHTML = '';
            resultContainer.classList.remove('hidden');

            if (json.status === 'success' && json.data.length > 0) {
                // Render setiap history pengajuan
                json.data.forEach(item => {
                    const dateObj = new Date(item.tanggal);
                    const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

                    // Logika warna badge
                    let badgeClass = 'menunggu';
                    if (item.status.toLowerCase().includes('revisi')) badgeClass = 'revisi';
                    else if (item.status.toLowerCase().includes('acc') || item.status.toLowerCase().includes('selesai')) badgeClass = 'di-acc';

                    // Tombol unduh jika ada revisi
                    let downloadHtml = '';
                    if (item.file_revisi && item.file_revisi.trim() !== '') {
                        // Konversi URL Drive menjadi Direct Download URL
                        let directUrl = item.file_revisi;
                        const matchId = item.file_revisi.match(/\/d\/(.+?)\//);
                        if (matchId && matchId[1]) {
                            directUrl = `https://drive.google.com/uc?export=download&id=${matchId[1]}`;
                        }
                        
                        downloadHtml = `<a href="${directUrl}" target="_blank" class="download-btn">Unduh Hasil Revisi</a>`;
                    }

                    const card = `
                        <div class="status-card">
                            <div class="status-info">
                                <h3>${item.judul}</h3>
                                <p>Diajukan pada: ${dateStr}</p>
                                <div style="margin-top: 10px;">
                                    <span class="badge ${badgeClass}">${item.status}</span>
                                </div>
                            </div>
                            <div class="status-action">
                                ${downloadHtml}
                            </div>
                        </div>
                    `;
                    resultContainer.insertAdjacentHTML('beforeend', card);
                });
            } else {
                resultContainer.innerHTML = `<div class="alert alert-success" style="background:#fff3cd; border-color:#ffeeba; color:#856404;">Data pengajuan dengan NIM ${nim} tidak ditemukan.</div>`;
            }

        } catch (error) {
            console.error("Error:", error);
            resultContainer.innerHTML = `<div class="alert alert-success" style="background:#f8d7da; border-color:#f5c6cb; color:#721c24;">Gagal mengambil data dari server. Pastikan URL Script benar.</div>`;
            resultContainer.classList.remove('hidden');
        } finally {
            btnSearch.textContent = "Cari";
            btnSearch.disabled = false;
        }
    });
}
