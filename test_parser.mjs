import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

// URL do arquivo no S3
const s3Url = process.argv[2];

if (!s3Url) {
  console.log('Usage: node test_parser.mjs <s3_url>');
  process.exit(1);
}

async function testParser() {
  try {
    console.log('Downloading file from:', s3Url);
    const response = await fetch(s3Url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log('File downloaded, size:', (buffer.length / 1024).toFixed(1), 'KB');
    
    console.log('Parsing Excel...');
    const workbook = XLSX.read(buffer, { 
      type: "buffer",
      cellDates: true,
      cellNF: false,
      cellStyles: false,
      cellHTML: false,
      dense: false,
    });
    
    console.log('Sheets:', workbook.SheetNames);
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, {
        raw: false,
        defval: '',
        blankrows: false,
      });
      
      console.log(`\nSheet: ${sheetName}, Rows: ${rawData.length}`);
      
      if (rawData.length > 0) {
        console.log('Columns:', Object.keys(rawData[0]));
        console.log('First row:', JSON.stringify(rawData[0], null, 2).substring(0, 500));
        if (rawData.length > 1) {
          console.log('Second row:', JSON.stringify(rawData[1], null, 2).substring(0, 500));
        }
      }
    }
    
    console.log('\nParser test completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

testParser();
