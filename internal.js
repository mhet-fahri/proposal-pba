// Ganti dengan URL Web App dari deployment Google Apps Script Anda nanti
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw1NSHXMIZyQuqO5Vt6XbTJfYF3M61wNXu72ve_1aHz16jIcrJui5PtGBdLAMYXSrER/exec';

document.addEventListener('DOMContentLoaded', () => {
    // Cek status session sederhana (localStorage)
    const sessionRole = localStorage.getItem('role');
    const sessionUser = localStorage.getItem('username');

    if (sessionRole) {
        showDashboard(sessionRole, sessionUser);
    }
});

// LOGIKA LOGIN
const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const btn = formLogin.querySelector('button');
        const errorBox = document.getElementById('login-error');

        btn.textContent = "Loading...";
        btn.disabled = true;
        errorBox.classList.add('hidden');

        try {
            // Karena ini sistem sederhana tanpa database eksternal kompleks,
            // login dicoba via POST API ke GAS.
            const payload = {
                action: 'login',
                username: user,
                password: pass
            };

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const json = await response.json();

            if (json.status === 'success') {
                localStorage.setItem('role', json.data.role); // 'admin' atau 'reviewer'
                localStorage.setItem('username', user);
                showDashboard(json.data.role, user);
            } else {
                errorBox.textContent = json.message || "Kredensial salah.";
                errorBox.classList.remove('hidden');
            }
        } catch (error) {
            // Fallback sederhana jika API belum diimplementasi (UNTUK TESTING UI SAJA)
            if (user === 'admin' && pass === 'admin') {
                localStorage.setItem('role', 'admin');
                showDashboard('admin', user);
            } else if (user.includes('reviewer') && pass === '123') {
                localStorage.setItem('role', 'reviewer');
                localStorage.setItem('username', user);
                showDashboard('reviewer', user);
            } else {
                errorBox.textContent = "Koneksi gagal atau kredensial salah.";
                errorBox.classList.remove('hidden');
            }
        } finally {
            btn.textContent = "Masuk";
            btn.disabled = false;
        }
    });
}

// FUNGSI LOGOUT
document.getElementById('btn-logout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    location.reload();
});

// MENAMPILKAN DASHBOARD BERDASARKAN ROLE
function showDashboard(role, username) {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('btn-logout').classList.remove('hidden');

    const safeRole = (role || "").toString().trim().toLowerCase();

    if (safeRole === 'admin') {
        document.getElementById('dashboard-admin').classList.remove('hidden');
        document.getElementById('dashboard-admin').classList.add('active');
        loadAdminDashboard();
    } else if (safeRole === 'reviewer') {
        document.getElementById('dashboard-reviewer').classList.remove('hidden');
        document.getElementById('dashboard-reviewer').classList.add('active');
        document.getElementById('reviewer-name').textContent = username;
        loadReviewerDashboard(username);
    } else {
        alert("Role akun tidak dikenali: " + role + ". Pastikan di Google Sheets tab Kredensial, kolom Role tertulis 'admin' atau 'reviewer' (huruf kecil).");
    }
}

// ==========================================
// ADMIN DASHBOARD LOGIC
// ==========================================
async function loadAdminDashboard() {
    // Di implementasi asli, ini akan fetch dari GAS (action=dashboard_stats)
    // Untuk demo UI kita mock data. Anda tinggal panggil API asli nantinya.

    // Fetch Daftar Dosen
    fetchDosenList();

    try {
        const response = await fetch(`${SCRIPT_URL}?action=dashboard_stats`);
        const json = await response.json();

        if (json.status === 'success') {
            document.getElementById('stat-total').textContent = json.data.total;
            document.getElementById('stat-belum').textContent = json.data.belum;
            document.getElementById('stat-revisi').textContent = json.data.revisi;
            document.getElementById('stat-selesai').textContent = json.data.selesai;

            renderAdminTable(json.data.menunggu_validasi);
            renderBebanDosen(json.data.beban_dosen);
        }
    } catch (e) {
        console.log("Menggunakan data dummy karena API error/belum siap.");
        // Dummy data for UI building
        document.getElementById('stat-total').textContent = 15;
        document.getElementById('stat-belum').textContent = 5;
        document.getElementById('stat-revisi').textContent = 3;
        document.getElementById('stat-selesai').textContent = 7;

        renderAdminTable([
            { id: 'REQ-123', tanggal: '2026-08-25', nama: 'Fulan', nim: '111901', judul: 'Analisis Nahwu' }
        ]);
        renderBebanDosen([
            { nama: 'Dr. Ahmad', beban: 2, mahasiswa: [{nama: 'Fulan', nim: '111901'}, {nama: 'Fulana', nim: '111902'}] },
            { nama: 'Prof. Budi', beban: 1, mahasiswa: [{nama: 'Umar', nim: '111903'}] }
        ]);
    }
}

let listDosenCache = [];
async function fetchDosenList() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=list_dosen`);
        const json = await response.json();
        if (json.status === 'success') {
            listDosenCache = json.data;
        }
    } catch (e) {
        listDosenCache = ['Dr. Ahmad', 'Prof. Budi', 'Ust. Fulan'];
    }
}

function formatDate(isoString) {
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString; // Fallback jika bukan tanggal valid
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch(e) {
        return isoString;
    }
}

function renderAdminTable(data) {
    const tbody = document.getElementById('table-admin-validasi');
    const btnContainer = document.getElementById('container-terbitkan-massal');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Tidak ada proposal yang menunggu validasi.</td></tr>';
        if(btnContainer) btnContainer.classList.add('hidden');
        return;
    }

    if(btnContainer) btnContainer.classList.remove('hidden');

    data.forEach(item => {
        let dosenOptions = '<option value="">-- Pilih Dosen --</option>';
        listDosenCache.forEach(d => {
            dosenOptions += `<option value="${d}">${d}</option>`;
        });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="white-space: nowrap;">${formatDate(item.tanggal)}</td>
            <td style="white-space: nowrap;"><strong>${item.nama}</strong><br><small>${item.nim}</small></td>
            <td style="word-wrap: break-word; word-break: break-word; min-width: 200px;">${item.judul}</td>
            <td style="min-width: 150px;">
                <select id="dosen-${item.id}" style="margin-bottom:0.5rem; padding:0.4rem; font-size:0.8rem;">
                    ${dosenOptions}
                </select>
                <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" onclick="terbitkanSurat('${item.id}')">Terbitkan Surat</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderBebanDosen(data) {
    const tbody = document.getElementById('table-beban-dosen');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Belum ada data bimbingan.</td></tr>';
        return;
    }

    data.forEach(item => {
        let listMhs = '<em style="color:var(--text-muted); font-size:0.9rem;">Belum ada mahasiswa</em>';
        if (item.mahasiswa && item.mahasiswa.length > 0) {
            listMhs = '<ul style="margin-left: 1.5rem; font-size:0.9rem; padding-left: 0; margin-bottom: 0;">';
            item.mahasiswa.forEach(mhs => {
                let nimText = mhs.nim ? ` (${mhs.nim})` : '';
                listMhs += `<li style="margin-bottom: 0.3rem;">${mhs.nama}${nimText}</li>`;
            });
            listMhs += '</ul>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="vertical-align: top; font-weight: 500;">${item.nama}</td>
            <td style="vertical-align: top;"><span class="badge" style="background-color: #f1f2f6; color: #2d3436;">${item.beban} Mahasiswa</span></td>
            <td style="vertical-align: top;">${listMhs}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function terbitkanSurat(idPengajuan, isMassal = false) {
    const ddl = document.getElementById(`dosen-${idPengajuan}`);
    const dosen = ddl.value;

    if (!dosen) {
        if(!isMassal) alert("Pilih dosen pembimbing terlebih dahulu!");
        return false;
    }

    if (isMassal || confirm(`Terbitkan Surat Bimbingan untuk ID ${idPengajuan} dengan Dosen: ${dosen}?`)) {
        // UI Loading
        const btn = document.querySelector(`button[onclick="terbitkanSurat('${idPengajuan}')"]`);
        const originalText = btn ? btn.textContent : "Terbitkan Surat";
        if (btn) { btn.disabled = true; btn.textContent = "Proses..."; }

        // Panggil API POST terbitkan_surat
        const payload = { action: 'terbitkan_surat', id: idPengajuan, dosen: dosen };
        try {
            const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
            const json = await res.json();
            if (json.status === 'success') {
                if(!isMassal) {
                    alert("Surat berhasil diterbitkan!");
                    loadAdminDashboard();
                }
                return true;
            } else {
                if(!isMassal) alert("Gagal: " + json.message);
                if (btn) { btn.disabled = false; btn.textContent = originalText; }
                return false;
            }
        } catch (e) {
            if(!isMassal) alert("Error koneksi saat memanggil API Terbitkan Surat.");
            if (btn) { btn.disabled = false; btn.textContent = originalText; }
            return false;
        }
    }
    return false;
}

async function terbitkanMasal() {
    const selects = document.querySelectorAll('select[id^="dosen-"]');
    const btnMassal = document.getElementById('btn-terbitkan-massal');
    
    const toProcess = [];
    selects.forEach(select => {
        if (select.value && select.value !== "") {
            const id = select.id.replace('dosen-', '');
            toProcess.push(id);
        }
    });

    if (toProcess.length === 0) {
        alert("Pilih Dosen Pembimbing untuk setidaknya 1 mahasiswa terlebih dahulu!");
        return;
    }

    if (!confirm(`Anda akan menerbitkan ${toProcess.length} surat secara berurutan. Proses ini akan memakan waktu beberapa saat. Lanjutkan?`)) return;

    btnMassal.disabled = true;
    let successCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
        const id = toProcess[i];
        btnMassal.textContent = `Memproses ${i+1} dari ${toProcess.length}...`;
        
        const isSuccess = await terbitkanSurat(id, true);
        if(isSuccess) successCount++;
    }
    
    btnMassal.textContent = "Terbitkan Semua Surat yang Dipilih";
    btnMassal.disabled = false;
    alert(`${successCount} dari ${toProcess.length} surat berhasil diterbitkan secara massal!`);
    loadAdminDashboard();
}

// ==========================================
// REVIEWER DASHBOARD LOGIC
// ==========================================
async function loadReviewerDashboard(username) {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=antrean_reviewer&reviewer=${username}`);
        const json = await response.json();

        if (json.status === 'success') {
            renderReviewerTable(json.data);
        }
    } catch (e) {
        console.log("Mock data reviewer karena API belum siap.");
        renderReviewerTable([
            { id: 'REQ-111', tanggal: '2026-08-25', nama: 'Fulan', judul: 'Skripsi 1', file_draft: '#' }
        ]);
    }
}

function renderReviewerTable(data) {
    const tbody = document.getElementById('table-reviewer');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Tidak ada antrean review saat ini.</td></tr>';
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="white-space: nowrap;">${formatDate(item.tanggal)}</td>
            <td style="white-space: nowrap;"><strong>${item.nama}</strong></td>
            <td style="word-wrap: break-word; word-break: break-word; min-width: 200px;">
                <p style="margin-bottom:0.5rem;">${item.judul}</p>
                <a href="${item.file_draft}" target="_blank" class="download-btn" style="padding:0.3rem 0.6rem; font-size:0.8rem;">Unduh Draft</a>
            </td>
            <td style="min-width: 180px;">
                <select id="status-${item.id}" style="margin-bottom:0.5rem; padding:0.4rem; font-size:0.8rem;">
                    <option value="Revisi">Minta Revisi</option>
                    <option value="Rekomendasi ACC">Rekomendasi Di-acc</option>
                </select>
                <input type="file" id="file-${item.id}" style="margin-bottom:0.5rem; font-size:0.8rem;" accept=".doc,.docx">
                <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" onclick="submitReview('${item.id}')">Kirim Review</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function submitReview(idPengajuan) {
    const status = document.getElementById(`status-${idPengajuan}`).value;
    const fileInput = document.getElementById(`file-${idPengajuan}`);
    let base64Data = "";
    let fileName = "";

    if (fileInput.files.length > 0) {
        base64Data = await getBase64(fileInput.files[0]);
        fileName = fileInput.files[0].name;
    }

    const payload = {
        action: 'update_revisi',
        id: idPengajuan,
        status: status,
        fileName: fileName,
        fileBase64: base64Data
    };

    try {
        await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("Review berhasil dikirim!");
        loadReviewerDashboard(localStorage.getItem('username'));
    } catch (e) {
        alert("Gagal mengirim review.");
    }
}

// Utils (Tersedia juga di app.js, ditaruh di sini agar script internal independen)
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
