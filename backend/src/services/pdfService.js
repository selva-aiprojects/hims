const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const os = require('os');

// Ensure PDF output directory exists - Use /tmp on Vercel/Production
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
const pdfDir = isProduction 
  ? path.join(os.tmpdir(), 'patients') 
  : (process.env.STORAGE_PATH ? path.join(process.env.STORAGE_PATH, 'patients') : path.join(__dirname, '../../uploads/patients'));

if (!isProduction && !fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

/**
 * Generates a professional Discharge Summary PDF.
 * Saves it to local drive: /patients/<patientId>-<ddmmyy>.pdf
 */
function createDischargeSummaryPDF(patient, admission, summaryText) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
      const filename = `${patient.id}-${dateStr}.pdf`;
      const filePath = path.join(pdfDir, filename);
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // --- HEADER ---
      doc.fontSize(24).font('Helvetica-Bold').text('HOSPITAL DISCHARGE SUMMARY', { align: 'center' });
      doc.moveDown(1);
      
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // --- PATIENT INFO ---
      doc.fontSize(12).font('Helvetica-Bold').text('Patient Information', { underline: true });
      doc.moveDown(0.5);
      
      doc.font('Helvetica').fontSize(10);
      doc.text(`Name: ${patient.name}       MRN: ${patient.mrn}`);
      doc.text(`Age/Gender: ${patient.age} / ${patient.gender}`);
      doc.text(`Phone: ${patient.phone}`);
      doc.moveDown(1);

      // --- ADMISSION INFO ---
      doc.fontSize(12).font('Helvetica-Bold').text('Admission Details', { underline: true });
      doc.moveDown(0.5);
      
      doc.font('Helvetica').fontSize(10);
      doc.text(`Date of Admission: ${new Date(admission.admitted_at).toLocaleDateString()}`);
      doc.text(`Date of Discharge: ${new Date().toLocaleDateString()}`);
      doc.text(`Admitting Ward: ${admission.ward_name} (Bed: ${admission.bed_number})`);
      doc.moveDown(1);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // --- AI CLINICAL SUMMARY ---
      doc.fontSize(12).font('Helvetica-Bold').text('Clinical Summary', { underline: true });
      doc.moveDown(0.5);
      
      doc.font('Helvetica').fontSize(10);
      // Render the AI text (handles basic newlines)
      doc.text(summaryText, {
        align: 'justify',
        lineGap: 4
      });

      doc.moveDown(3);

      // --- SIGNATURE BLOCK ---
      const bottomY = doc.page.height - 150;
      if (doc.y > bottomY) {
        doc.addPage();
      } else {
        doc.y = bottomY;
      }
      
      doc.font('Helvetica').fontSize(10);
      doc.text('_________________________________', 50, doc.y);
      doc.text('Attending Physician Signature', 50, doc.y + 15);
      
      doc.text('_________________________________', 350, doc.y - 15);
      doc.text('Patient / Guardian Signature', 350, doc.y);

      doc.end();

      stream.on('finish', () => {
        resolve({
          success: true,
          filePath: filePath,
          filename: filename
        });
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  createDischargeSummaryPDF
};
