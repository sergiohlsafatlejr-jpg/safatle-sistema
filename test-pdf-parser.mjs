import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as fs from 'fs';
import * as https from 'https';

// URL do arquivo PDF (precisamos buscar do banco)
const testUrl = process.argv[2];

if (!testUrl) {
  console.log('Usage: node test-pdf-parser.mjs <pdf_url>');
  process.exit(1);
}

async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function parsePDF(buffer) {
  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    
    console.log('PDF loaded successfully!');
    console.log('Number of pages:', pdf.numPages);
    
    // Extract text from all pages
    for (let i = 1; i <= Math.min(3, pdf.numPages); i++) {
      console.log(`\n--- Page ${i} ---`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      console.log(pageText.substring(0, 2000));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Downloading PDF from:', testUrl);
  const buffer = await downloadFile(testUrl);
  console.log('Downloaded', buffer.length, 'bytes');
  
  await parsePDF(buffer);
}

main().catch(console.error);
