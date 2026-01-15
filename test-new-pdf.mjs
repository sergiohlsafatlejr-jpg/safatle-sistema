import { storageGet } from "./server/storage.ts";
import * as fs from "fs";

async function main() {
  const s3Key = "arquivos/1/p9dFQoOJtYBw9z8tdAze_-Demostrativo_analise_conta.pdf.pdf";
  
  console.log('Getting presigned URL for:', s3Key);
  
  try {
    const { url } = await storageGet(s3Key);
    console.log('Presigned URL:', url);
    
    // Try to download
    const response = await fetch(url);
    console.log('Response status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log('Downloaded size:', buffer.length);
    
    // Check if it's a PDF
    const header = buffer.slice(0, 10).toString();
    console.log('File header:', header);
    
    if (header.startsWith('%PDF')) {
      console.log('Valid PDF file!');
      fs.writeFileSync('saude-caixa-valid.pdf', buffer);
      console.log('Saved to saude-caixa-valid.pdf');
    } else {
      console.log('Not a PDF, content:', buffer.toString().substring(0, 200));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
