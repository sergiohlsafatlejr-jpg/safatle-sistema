import { storagePut, storageGet } from "./server/storage.ts";
import * as fs from "fs";

async function main() {
  // Create a test file
  const testContent = "Hello, this is a test PDF content";
  const testKey = `test/test-upload-${Date.now()}.txt`;
  
  console.log('Uploading test file to:', testKey);
  
  try {
    const { url, key } = await storagePut(testKey, Buffer.from(testContent), "text/plain");
    console.log('Upload successful!');
    console.log('URL:', url);
    console.log('Key:', key);
    
    // Try to download it back
    console.log('\nTrying to download...');
    const { url: downloadUrl } = await storageGet(key);
    console.log('Download URL:', downloadUrl);
    
    const response = await fetch(downloadUrl);
    const text = await response.text();
    console.log('Downloaded content:', text);
    console.log('Match:', text === testContent);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
