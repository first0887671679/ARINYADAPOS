import fs from 'fs';
import path from 'path';

const url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf';

async function main() {
  // Regular
  console.log('Downloading Sarabun Regular...');
  const res1 = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf');
  const buf1 = Buffer.from(await res1.arrayBuffer());
  console.log('Regular font size:', buf1.length, 'bytes');
  fs.writeFileSync(path.resolve('src/lib/sarabun-regular.ts'), 
    `// Auto-generated - Sarabun Regular font for jsPDF\nexport const SARABUN_REGULAR = "${buf1.toString('base64')}";\n`);

  // Bold
  console.log('Downloading Sarabun Bold...');
  const res2 = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf');
  const buf2 = Buffer.from(await res2.arrayBuffer());
  console.log('Bold font size:', buf2.length, 'bytes');
  fs.writeFileSync(path.resolve('src/lib/sarabun-bold.ts'), 
    `// Auto-generated - Sarabun Bold font for jsPDF\nexport const SARABUN_BOLD = "${buf2.toString('base64')}";\n`);

  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
