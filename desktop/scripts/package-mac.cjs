const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');

const packager = require('@electron/packager');

const rootDir = path.resolve(__dirname, '..', '..');
const outputDir = path.join(rootDir, 'dist-desktop');
const iconPath = path.join(rootDir, 'desktop', 'assets', 'icon.icns');
const arch = process.arch === 'arm64' ? 'arm64' : 'x64';

const ignorePrefixes = [
  '.git/',
  '.next/',
  '.dart_tool/',
  '.devcontainer/',
  'android/',
  'ios/',
  'lib/',
  'integration_test/',
  'test/',
  'postman/',
  'docs/',
  'backend/',
  'web/',
  'dist-desktop/',
  'node_modules/',
];

function shouldIgnore(filePath) {
  const relative = path.relative(rootDir, filePath).split(path.sep).join('/');

  if (!relative || relative === '.') {
    return false;
  }

  return ignorePrefixes.some((prefix) => relative === prefix.slice(0, -1) || relative.startsWith(prefix));
}

async function main() {
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Missing mac icon: ${iconPath}. Run \"npm run desktop:icon:mac\" first.`);
  }

  const appPaths = await packager({
    dir: rootDir,
    out: outputDir,
    name: 'BioTrack',
    executableName: 'BioTrack',
    platform: 'darwin',
    arch,
    overwrite: true,
    asar: true,
    prune: true,
    appVersion: '1.0.0',
    appBundleId: 'com.biotrack.healthcare',
    appCategoryType: 'public.app-category.medical',
    darwinDarkModeSupport: true,
    ignore: shouldIgnore,
  });

  console.log('macOS package created at:');
  for (const appPath of appPaths) {
    const resourcesDir = path.join(appPath, 'BioTrack.app', 'Contents', 'Resources');
    const electronIconPath = path.join(resourcesDir, 'electron.icns');
    const appIconPath = path.join(resourcesDir, 'BioTrack.icns');

    await fsPromises.copyFile(iconPath, electronIconPath);
    await fsPromises.copyFile(iconPath, appIconPath);

    console.log(`- ${appPath}`);
    console.log(`  App bundle: ${path.join(appPath, 'BioTrack.app')}`);
    console.log(`  Icon: ${electronIconPath}`);
  }
}

main().catch((error) => {
  console.error('Failed to build macOS package:', error);
  process.exitCode = 1;
});
