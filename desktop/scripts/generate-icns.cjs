const fs = require('node:fs/promises');
const path = require('node:path');

const sharp = require('sharp');
const png2icons = require('png2icons');

const rootDir = path.resolve(__dirname, '..', '..');
const sourceSvgPath = path.join(rootDir, 'web', 'public', 'icon.svg');
const assetsDir = path.join(rootDir, 'desktop', 'assets');
const outputIcnsPath = path.join(assetsDir, 'icon.icns');

async function main() {
  await fs.mkdir(assetsDir, { recursive: true });

  const sourcePng = await sharp(sourceSvgPath)
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toBuffer();

  const icnsBuffer = png2icons.createICNS(sourcePng, png2icons.BILINEAR, 0, false);
  if (!icnsBuffer || !icnsBuffer.length) {
    throw new Error('png2icons failed to create an ICNS buffer.');
  }

  await fs.writeFile(outputIcnsPath, Buffer.from(icnsBuffer));

  console.log(`Generated macOS icon: ${outputIcnsPath}`);
}

main().catch((error) => {
  console.error('Failed to generate .icns file:', error);
  process.exitCode = 1;
});
