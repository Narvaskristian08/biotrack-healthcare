const fs = require('node:fs/promises');
const path = require('node:path');

const sharp = require('sharp');
const pngToIco = require('png-to-ico');

const rootDir = path.resolve(__dirname, '..', '..');
const sourceSvgPath = path.join(rootDir, 'web', 'public', 'icon.svg');
const assetsDir = path.join(rootDir, 'desktop', 'assets');
const tempDir = path.join(assetsDir, '.iconset-tmp');
const outputPngPath = path.join(assetsDir, 'icon.png');
const outputIcoPath = path.join(assetsDir, 'icon.ico');

const icoSizes = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(assetsDir, { recursive: true });

  const pngBuffers = [];

  for (const size of icoSizes) {
    const resizedPngPath = path.join(tempDir, `icon-${size}.png`);
    await sharp(sourceSvgPath)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(resizedPngPath);

    pngBuffers.push(await fs.readFile(resizedPngPath));
  }

  await sharp(sourceSvgPath)
    .resize(256, 256, { fit: 'cover' })
    .png()
    .toFile(outputPngPath);

  const icoBuffer = await pngToIco(pngBuffers);
  await fs.writeFile(outputIcoPath, icoBuffer);

  await fs.rm(tempDir, { recursive: true, force: true });

  console.log(`Generated icon files:\n- ${outputPngPath}\n- ${outputIcoPath}`);
}

main().catch((error) => {
  console.error('Failed to generate .ico file:', error);
  process.exitCode = 1;
});
