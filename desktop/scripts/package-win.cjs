const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { downloadArtifact } = require('@electron/get');
const ResEdit = require('resedit');

const rootDir = path.resolve(__dirname, '..', '..');
const outputDir = path.join(rootDir, 'dist-desktop');
const appName = 'BioTrack';
const targetDir = path.join(outputDir, `${appName}-win32-x64`);
const iconPngPath = path.join(rootDir, 'desktop', 'assets', 'icon.png');
const iconIcoPath = path.join(rootDir, 'desktop', 'assets', 'icon.ico');

async function unzipArchive(zipPath, destinationDir) {
  const unzip = spawnSync('unzip', ['-q', zipPath, '-d', destinationDir], {
    stdio: 'inherit',
  });

  if (unzip.status !== 0) {
    throw new Error(`Failed to unzip Electron archive (exit ${unzip.status ?? 'unknown'}).`);
  }
}

async function stageDesktopAppFiles() {
  const appRoot = path.join(targetDir, 'resources', 'app');
  const desktopDir = path.join(appRoot, 'desktop');
  const desktopAssetsDir = path.join(desktopDir, 'assets');

  await fs.mkdir(desktopAssetsDir, { recursive: true });

  await fs.copyFile(path.join(rootDir, 'desktop', 'main.cjs'), path.join(desktopDir, 'main.cjs'));
  await fs.copyFile(path.join(rootDir, 'desktop', 'preload.cjs'), path.join(desktopDir, 'preload.cjs'));
  await fs.copyFile(iconPngPath, path.join(desktopAssetsDir, 'icon.png'));
  await fs.copyFile(iconIcoPath, path.join(desktopAssetsDir, 'icon.ico'));

  const packagedManifest = {
    name: 'biotrack-healthcare-desktop',
    productName: appName,
    version: '1.0.0',
    main: 'desktop/main.cjs',
  };

  await fs.writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify(packagedManifest, null, 2)}\n`);
}

async function embedExeIcon(exePath, icoPath) {
  const exeBuffer = await fs.readFile(exePath);
  const icoBuffer = await fs.readFile(icoPath);

  const exe = ResEdit.NtExecutable.from(
    exeBuffer.buffer.slice(exeBuffer.byteOffset, exeBuffer.byteOffset + exeBuffer.byteLength)
  );
  const resources = ResEdit.NtExecutableResource.from(exe);
  const iconFile = ResEdit.Data.IconFile.from(
    icoBuffer.buffer.slice(icoBuffer.byteOffset, icoBuffer.byteOffset + icoBuffer.byteLength)
  );

  // 1033 is en-US language resource ID; it works as a default icon resource for Windows shell.
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    resources.entries,
    1,
    1033,
    iconFile.icons.map((entry) => entry.data)
  );
  resources.outputResource(exe);

  const updatedExeBuffer = Buffer.from(exe.generate());
  await fs.writeFile(exePath, updatedExeBuffer);
}

async function main() {
  if (!fsSync.existsSync(iconPngPath) || !fsSync.existsSync(iconIcoPath)) {
    throw new Error('Missing desktop icons. Run "npm run desktop:icon" first.');
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  const electronVersion = require('electron/package.json').version;

  console.log(`Downloading Electron v${electronVersion} for win32-x64...`);
  const zipPath = await downloadArtifact({
    version: electronVersion,
    artifactName: 'electron',
    platform: 'win32',
    arch: 'x64',
  });

  console.log(`Extracting runtime from: ${zipPath}`);
  await unzipArchive(zipPath, targetDir);

  const defaultExePath = path.join(targetDir, 'electron.exe');
  const finalExePath = path.join(targetDir, `${appName}.exe`);

  if (fsSync.existsSync(finalExePath)) {
    await fs.rm(finalExePath, { force: true });
  }

  await fs.rename(defaultExePath, finalExePath);
  await embedExeIcon(finalExePath, iconIcoPath);
  await stageDesktopAppFiles();

  console.log('Windows package created:');
  console.log(`- Folder: ${targetDir}`);
  console.log(`- Executable: ${finalExePath}`);
  console.log(`- ICO file: ${iconIcoPath}`);
}

main().catch((error) => {
  console.error('Failed to build Windows package:', error);
  process.exitCode = 1;
});
