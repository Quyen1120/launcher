import sharp from 'sharp';
import fs from 'fs';

async function generateIcon() {
  const svg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#0a0a0c"/>
      <circle cx="512" cy="512" r="400" fill="none" stroke="#3b82f6" stroke-width="40"/>
      <text x="512" y="600" font-family="Arial" font-size="400" font-weight="bold" fill="#ffffff" text-anchor="middle">LW</text>
    </svg>
  `;

  fs.mkdirSync('assets', { recursive: true });
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile('assets/icon.png');
    
  await sharp(Buffer.from(svg))
    .png()
    .toFile('assets/splash.png');
    
  console.log('Generated placeholder icons.');
}

generateIcon().catch(console.error);
