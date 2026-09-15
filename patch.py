import re

with open('backend/code.gs', 'r') as f:
    content = f.read()

# 1. Replace SPREADSHEET_ID
content = re.sub(
    r"const SPREADSHEET_ID = 'GANTI_DENGAN_ID_SPREADSHEET_ANDA';",
    "const SPREADSHEET_ID = '1ZEy_TPM5rihHzpo0vXSENRjsnbzLE5NmGHUr4rSvyQs';",
    content
)

# 2. Update getDashboardStats
old_stats = """  // Objek untuk menghitung beban dosen secara otomatis
  let bebanCounter = {};
  
  for (let i = 1; i < data.length; i++) {
    let status = data[i][8];
    
    // Hitung beban bimbingan jika statusnya Di-acc
    if (status === "Di-acc") {
      selesai++;
      let namaDosen = data[i][11]; // Kolom L (Dosen Pembimbing)
      if (namaDosen) {
        bebanCounter[namaDosen] = (bebanCounter[namaDosen] || 0) + 1;
      }
    }
    else if (status === "Menunggu Review") belum++;
    else if (status.includes("Revisi")) revisi++;
    else if (status === "Rekomendasi ACC") {
      revisi++; // Masuk antrean proses
      menungguValidasi.push({
        id: data[i][1], tanggal: data[i][0], nama: data[i][2], nim: data[i][3], judul: data[i][6]
      });
    }
  }
  
  // Ambil List Dosen & Gabungkan dengan hasil perhitungan beban
  const sheetDosen = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Data_Dosen');
  const dosenData = sheetDosen.getDataRange().getValues();
  const bebanDosen = [];
  
  for (let i = 1; i < dosenData.length; i++) {
    if(dosenData[i][0]) {
      let namaDosen = dosenData[i][0];
      // Jika ada di bebanCounter ambil angkanya, jika tidak 0
      let beban = bebanCounter[namaDosen] || 0; 
      bebanDosen.push({ nama: namaDosen, beban: beban });
    }
  }"""

new_stats = """  // Objek untuk menghitung beban dosen dan mencatat mahasiswa bimbingan
  let dosenMap = {};
  
  for (let i = 1; i < data.length; i++) {
    let status = data[i][8];
    
    // Hitung beban bimbingan jika statusnya Di-acc
    if (status === "Di-acc") {
      selesai++;
      let namaDosen = data[i][11]; // Kolom L (Dosen Pembimbing)
      if (namaDosen) {
        if (!dosenMap[namaDosen]) dosenMap[namaDosen] = [];
        dosenMap[namaDosen].push({ nama: data[i][2], nim: data[i][3] });
      }
    }
    else if (status === "Menunggu Review") belum++;
    else if (status.includes("Revisi")) revisi++;
    else if (status === "Rekomendasi ACC") {
      revisi++; // Masuk antrean proses
      menungguValidasi.push({
        id: data[i][1], tanggal: data[i][0], nama: data[i][2], nim: data[i][3], judul: data[i][6]
      });
    }
  }
  
  // Ambil List Dosen & Gabungkan dengan hasil perhitungan beban
  const sheetDosen = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Data_Dosen');
  const dosenData = sheetDosen.getDataRange().getValues();
  const bebanDosen = [];
  
  for (let i = 1; i < dosenData.length; i++) {
    if(dosenData[i][0]) {
      let namaDosen = dosenData[i][0];
      let mhsList = dosenMap[namaDosen] || [];
      let beban = mhsList.length;
      
      // Update sheet Data_Dosen kolom B (ke-2) dengan jumlah bimbingan
      sheetDosen.getRange(i + 1, 2).setValue(beban);
      
      bebanDosen.push({ nama: namaDosen, beban: beban, mahasiswa: mhsList });
    }
  }"""

content = content.replace(old_stats, new_stats)


# 3. Update terbitkanSurat
old_terbitkan = """  // 1. Generate Nomor Surat
  // Format: B - 0793/F.1/PP.01.1/VIII/2026
  const romawiBulan = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const date = new Date();
  const b = romawiBulan[date.getMonth()];
  const y = date.getFullYear();
  const counterStr = ("0000" + (rowIndex - 1)).slice(-4);
  const noSurat = `B - ${counterStr}/F.1/PP.01.1/${b}/${y}`;"""

new_terbitkan = """  // 1. Generate Nomor Surat dari Sheet "Pengaturan"
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheetPengaturan = ss.getSheetByName("Pengaturan");
  
  // Jika sheet Pengaturan belum ada, buat otomatis dan set nomor awal
  if (!sheetPengaturan) {
    sheetPengaturan = ss.insertSheet("Pengaturan");
    sheetPengaturan.getRange("A1").setValue("Nomor Surat Terakhir");
    sheetPengaturan.getRange("B1").setValue(0);
  }
  
  let angkaTerakhir = sheetPengaturan.getRange("B1").getValue() || 0;
  let angkaBaru = Number(angkaTerakhir) + 1;
  sheetPengaturan.getRange("B1").setValue(angkaBaru);
  
  // Format: B - 001/F.1/PP.01.1/VIII/2026
  const romawiBulan = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const date = new Date();
  const b = romawiBulan[date.getMonth()];
  const y = date.getFullYear();
  const counterStr = Utilities.formatString("%03d", angkaBaru); // 3 digit
  const noSurat = `B - ${counterStr}/F.1/PP.01.1/${b}/${y}`;"""

content = content.replace(old_terbitkan, new_terbitkan)

with open('backend/code.gs', 'w') as f:
    f.write(content)

