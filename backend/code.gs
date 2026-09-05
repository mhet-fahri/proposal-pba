/**
 * SISTEM REVIEW OUTLINE PROPOSAL MAHASISWA - BACKEND GAS
 * ======================================================
 */

const SPREADSHEET_ID = 'GANTI_DENGAN_ID_SPREADSHEET_ANDA';
const FOLDER_DRAFT_ID = 'GANTI_DENGAN_ID_FOLDER_DRAFT_DRIVE';
const FOLDER_REVISI_ID = 'GANTI_DENGAN_ID_FOLDER_REVISI_DRIVE';
const FOLDER_SURAT_ID = 'GANTI_DENGAN_ID_FOLDER_SURAT_DRIVE';
const TEMPLATE_DOC_ID = 'GANTI_DENGAN_ID_FILE_TEMPLATE_GOOGLE_DOCS';
const TTD_IMAGE_ID = 'GANTI_DENGAN_ID_FILE_GAMBAR_TTD_KAPRODI'; 

// ==========================================
// ROUTING API
// ==========================================
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'status') return getStatus(e.parameter.nim);
    if (action === 'direktori_surat') return getDirektoriSurat();
    if (action === 'dashboard_stats') return getDashboardStats();
    if (action === 'antrean_reviewer') return getAntreanReviewer(e.parameter.reviewer);
    if (action === 'list_dosen') return getListDosen();
    return buildSuccessResponse({ message: "API Backend Aktif." });
  } catch (error) {
    return buildErrorResponse(error.message);
  }
}

function doPost(e) {
  try {
    let body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    const action = body.action || e.parameter.action;

    if (action === 'submit_pengajuan') return submitPengajuan(body);
    if (action === 'login') return loginUser(body.username, body.password);
    if (action === 'update_revisi') return updateRevisi(body);
    if (action === 'terbitkan_surat') return terbitkanSurat(body);

    return buildErrorResponse("Action tidak valid.");
  } catch (error) {
    return buildErrorResponse(error.message);
  }
}

// ==========================================
// 1. PUBLIC API (Mahasiswa & Dosen)
// ==========================================
function submitPengajuan(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Data_Pengajuan');
  let fileUrl = "";
  if (data.fileBase64 && data.fileName) {
    fileUrl = saveFileToDrive(data.fileBase64, data.fileName, FOLDER_DRAFT_ID);
  }
  const timestamp = new Date();
  const idPengajuan = "REQ-" + timestamp.getTime();
  
  // Default assign ke reviewer1 (bisa diubah manual oleh admin nanti)
  sheet.appendRow([
    timestamp, idPengajuan, data.nama, data.nim, data.semester, data.email, 
    data.judul, fileUrl, "Menunggu Review", "", "reviewer1", "", "", ""
  ]);
  
  return buildSuccessResponse({ message: "Pengajuan disubmit!", id: idPengajuan });
}

function getStatus(nim) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Data_Pengajuan');
  const data = sheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] == nim) {
      results.push({
        tanggal: data[i][0], nama: data[i][2], judul: data[i][6], 
        status: data[i][8], file_revisi: data[i][9]
      });
    }
  }
  return buildSuccessResponse(results);
}

function getDirektoriSurat() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Data_Pengajuan');
  const data = sheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < data.length; i++) {
    // Ambil yang statusnya Di-acc dan ada URL suratnya
    if (data[i][8] === "Di-acc" && data[i][12] !== "") {
      results.push({
        tanggal: data[i][0], no_surat: data[i][13], nama_mhs: data[i][2], 
        nim: data[i][3], dosen: data[i][11], url_surat: data[i][12]
      });
    }
  }
  return buildSuccessResponse(results.reverse()); // Urutkan terbaru
}

// ==========================================
// 2. INTERNAL API (Dashboard & Reviewer)
// ==========================================
function loginUser(username, password) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Kredensial');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
      return buildSuccessResponse({ role: data[i][2], username: username });
    }
  }
  return buildErrorResponse("Username atau Password salah.");
}

function getListDosen() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Data_Dosen');
  const data = sheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < data.length; i++) {
    if(data[i][0]) results.push(data[i][0]);
  }
  return buildSuccessResponse(results);
}

function getDashboardStats() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Data_Pengajuan');
  const data = sheet.getDataRange().getValues();
  
  let total = data.length - 1;
  let belum = 0; let revisi = 0; let selesai = 0;
  let menungguValidasi = [];
  
  // Objek untuk menghitung beban dosen secara otomatis
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
  }
  
  return buildSuccessResponse({
    total: total, belum: belum, revisi: revisi, selesai: selesai,
    menunggu_validasi: menungguValidasi, beban_dosen: bebanDosen
  });
}

function getAntreanReviewer(reviewer) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Data_Pengajuan');
  const data = sheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][10] === reviewer && data[i][8] === "Menunggu Review") {
      results.push({
        id: data[i][1], tanggal: data[i][0], nama: data[i][2], 
        judul: data[i][6], file_draft: data[i][7]
      });
    }
  }
  return buildSuccessResponse(results);
}

function updateRevisi(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Data_Pengajuan');
  const sheetData = sheet.getDataRange().getValues();
  
  let fileUrl = "";
  if (data.fileBase64 && data.fileName) {
    fileUrl = saveFileToDrive(data.fileBase64, data.fileName, FOLDER_REVISI_ID);
  }
  
  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][1] === data.id) {
      sheet.getRange(i + 1, 9).setValue(data.status); // Kolom I: Status
      if (fileUrl) sheet.getRange(i + 1, 10).setValue(fileUrl); // Kolom J: File Revisi
      
      // TRIGGER EMAIL MAHASISWA (Jika Revisi)
      if(data.status === "Revisi") {
        const emailMhs = sheetData[i][5];
        MailApp.sendEmail(emailMhs, "Hasil Review Outline Proposal Anda", 
          `Halo ${sheetData[i][2]},\n\nOutline proposal Anda telah direview. Silakan cek catatan revisi pada file berikut:\n${fileUrl}\n\nTerima kasih.`
        );
      }
      return buildSuccessResponse({ message: "Update berhasil." });
    }
  }
  return buildErrorResponse("ID tidak ditemukan.");
}

// ==========================================
// 3. GENERATOR SURAT & QR CODE
// ==========================================
function terbitkanSurat(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Data_Pengajuan');
  const sheetData = sheet.getDataRange().getValues();
  let rowData = null;
  let rowIndex = -1;
  
  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][1] === data.id) {
      rowData = sheetData[i];
      rowIndex = i + 1;
      break;
    }
  }
  
  if (!rowData) return buildErrorResponse("ID tidak ditemukan.");
  
  // 1. Generate Nomor Surat
  // Format: B - 0793/F.1/PP.01.1/VIII/2026
  const romawiBulan = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const date = new Date();
  const b = romawiBulan[date.getMonth()];
  const y = date.getFullYear();
  const counterStr = ("0000" + (rowIndex - 1)).slice(-4);
  const noSurat = `B - ${counterStr}/F.1/PP.01.1/${b}/${y}`;
  
  // 2. Buat Copy Template Docs
  const templateFile = DriveApp.getFileById(TEMPLATE_DOC_ID);
  const suratFolder = DriveApp.getFolderById(FOLDER_SURAT_ID);
  const copyFile = templateFile.makeCopy(`Surat_Bimbingan_${rowData[2]}_${rowData[3]}`, suratFolder);
  const doc = DocumentApp.openById(copyFile.getId());
  const body = doc.getBody();
  
  // 3. Replace Text Placeholder
  body.replaceText('{{NO_SURAT}}', noSurat);
  body.replaceText('{{NAMA}}', rowData[2]);
  body.replaceText('{{NIM}}', rowData[3]);
  body.replaceText('{{SEMESTER}}', rowData[4]);
  
  // Auto-shrink untuk Judul yang terlalu panjang
  let judulText = rowData[6];
  let judulElement = body.findText('{{JUDUL}}');
  if (judulElement) {
    let el = judulElement.getElement();
    let text = el.getText();
    el.setText(text.replace('{{JUDUL}}', judulText));
    // Jika judul lebih dari 90 karakter, kecilkan ukuran hurufnya
    if (judulText.length > 90) {
      el.setFontSize(10);
    }
  } else {
    body.replaceText('{{JUDUL}}', judulText);
  }
  body.replaceText('{{DOSEN_PEMBIMBING}}', data.dosen);
  body.replaceText('{{TANGGAL}}', date.toLocaleDateString('id-ID'));
  
  // 4. Generate & Inject QR Code Timestamp
  try {
    const timestampStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    const qrText = `Surat asli dikeluarkan oleh PBA FITK UIN Jakarta. a.n ${rowData[2]} (${rowData[3]}). Disahkan pada: ${timestampStr}`;
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrText)}&size=150`;
    const qrBlob = UrlFetchApp.fetch(qrUrl).getBlob().getAs('image/png');
    replaceTextWithImage(body, '{{QR_CODE}}', qrBlob, 80); // Set ukuran QR Code menjadi 80px
  } catch (e) {
    throw new Error("Gagal generate QR Code: " + e.message);
  }
  
  // 5. Inject TTD Basah
  try {
    const ttdFile = DriveApp.getFileById(TTD_IMAGE_ID);
    const ttdBlob = ttdFile.getBlob().getAs(MimeType.PNG);
    replaceTextWithImage(body, '{{TTD_KAPRODI}}', ttdBlob, 150); // Set ukuran TTD menjadi 150px
  } catch (e) {
    throw new Error("Gagal menyisipkan TTD: " + e.message);
  }
  
  doc.saveAndClose();
  
  // Memastikan dokumen sudah tersimpan sebelum diconvert
  Utilities.sleep(6000); 
  
  // 6. Convert to PDF
  let pdfBlob;
  try {
    pdfBlob = copyFile.getAs('application/pdf');
  } catch (e) {
    throw new Error("Gagal mengonversi ke PDF (Data gambar di Docs tidak valid bagi Google PDF Converter): " + e.message);
  }
  const pdfFile = suratFolder.createFile(pdfBlob);
  pdfFile.setName(`Surat_Bimbingan_${rowData[2]}_${rowData[3]}.pdf`);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Optional: Hapus file Docs temporer agar Drive bersih
  copyFile.setTrashed(true);
  
  // 7. Update Spreadsheet
  sheet.getRange(rowIndex, 9).setValue("Di-acc");
  sheet.getRange(rowIndex, 12).setValue(data.dosen);
  sheet.getRange(rowIndex, 13).setValue(pdfFile.getUrl());
  sheet.getRange(rowIndex, 14).setValue(noSurat);
  
  // 8. Kirim Email ke Mahasiswa
  MailApp.sendEmail({
    to: rowData[5],
    subject: "Surat Permohonan Bimbingan Proposal Anda",
    htmlBody: `<p>Selamat ${rowData[2]}, outline proposal Anda telah disetujui.</p>
               <p>Berikut terlampir Surat Permohonan Bimbingan yang ditujukan kepada <b>${data.dosen}</b>.</p>
               <p>Surat ini sudah sah ditandatangani secara digital. Anda bisa langsung menghubungi Dosen Pembimbing.</p>`,
    attachments: [pdfBlob]
  });
  
  return buildSuccessResponse({ message: "Surat berhasil diterbitkan." });
}

function replaceTextWithImage(body, textToReplace, imageBlob, targetWidth) {
  let next = body.findText(textToReplace);
  if (!next) return;
  let textElement = next.getElement();
  let parent = textElement.getParent();
  
  // Hapus teks placeholder
  textElement.setText(textElement.getText().replace(textToReplace, ''));
  
  // Sisipkan gambar di paragraf tersebut
  if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
    let img = parent.asParagraph().insertInlineImage(0, imageBlob);
    
    // Resize secara proporsional jika parameter targetWidth diberikan
    if (targetWidth) {
      let origWidth = img.getWidth();
      let origHeight = img.getHeight();
      let ratio = origHeight / origWidth;
      img.setWidth(targetWidth);
      img.setHeight(targetWidth * ratio);
    }
  }
}

// ==========================================
// UTILS & CORS
// ==========================================
function saveFileToDrive(base64Data, filename, folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const contentType = base64Data.substring(5, base64Data.indexOf(';'));
  const bytes = Utilities.base64Decode(base64Data.substring(base64Data.indexOf(',') + 1));
  const blob = Utilities.newBlob(bytes, contentType, filename);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function buildSuccessResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
