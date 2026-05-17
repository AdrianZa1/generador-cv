import fs from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';

async function makePdf(texts) {
  const doc = await PDFDocument.create();
  for (const t of texts) {
    const page = doc.addPage([595, 842]);
    const { width, height } = page.getSize();
    page.drawText(t, { x: 50, y: height - 80, size: 20, color: rgb(0,0,0) });
  }
  return await doc.save();
}

async function main() {
  const baseBytes = await makePdf(['Base page 1', 'Base page 2']);
  const att1 = await makePdf(['Cert1 page 1', 'Cert1 page 2']);
  const att2 = await makePdf(['Cert2 page 1']);

  const baseB64 = Buffer.from(baseBytes).toString('base64');
  const att1B64 = Buffer.from(att1).toString('base64');
  const att2B64 = Buffer.from(att2).toString('base64');

  const payload = {
    basePdf: baseB64,
    attachments: [
      { fileName: 'cert1.pdf', fileData: 'data:application/pdf;base64,' + att1B64 },
      { fileName: 'cert2.pdf', fileData: 'data:application/pdf;base64,' + att2B64 }
    ]
  };

  const r = await fetch('http://localhost:3000/merge-pdfs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) {
    console.error('Merge request failed', await r.text());
    process.exit(1);
  }
  const ab = await r.arrayBuffer();
  fs.writeFileSync('merged-test.pdf', Buffer.from(ab));
  console.log('merged-test.pdf written');
}

main().catch(e => { console.error(e); process.exit(1); });
