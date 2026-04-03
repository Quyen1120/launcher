import fs from 'fs';
import path from 'path';

async function run() {
  const url = 'https://macaulay-api-storage-dir.storage.googleapis.com/uploads/1743604488339-1743604488339.png';
  console.log('Downloading logo...');
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  
  fs.mkdirSync('assets', { recursive: true });
  fs.writeFileSync('assets/icon.png', Buffer.from(buffer));
  fs.writeFileSync('assets/splash.png', Buffer.from(buffer));
  console.log('Assets saved successfully.');
}

run().catch(console.error);
