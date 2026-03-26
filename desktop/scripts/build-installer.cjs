const path = require('node:path');

const { build, Platform, Arch } = require('electron-builder');

const rootDir = path.resolve(__dirname, '..', '..');
const outputDir = path.join(rootDir, 'dist-installer');

function normalizePlatform(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'mac' || v === 'darwin' || v === 'osx') {
    return 'mac';
  }

  if (v === 'win' || v === 'windows' || v === 'win32') {
    return 'win';
  }

  return '';
}

function resolvePlatform() {
  const argPlatform = normalizePlatform(process.argv[2]);
  if (argPlatform) {
    return argPlatform;
  }

  const envPlatform = normalizePlatform(process.env.BIOTRACK_INSTALLER_PLATFORM);
  if (envPlatform) {
    return envPlatform;
  }

  if (process.platform === 'darwin') {
    return 'mac';
  }

  if (process.platform === 'win32') {
    return 'win';
  }

  throw new Error(
    `Unsupported host platform (${process.platform}). Use \"desktop:installer:win\" or \"desktop:installer:mac\" explicitly.`
  );
}

function createConfig() {
  return {
    appId: 'com.biotrack.healthcare',
    productName: 'BioTrack',
    directories: {
      output: outputDir,
      buildResources: path.join(rootDir, 'desktop', 'assets'),
    },
    files: [
      'desktop/**/*',
      'package.json',
      '!desktop/scripts/**',
      '!dist-desktop/**',
      '!dist-installer/**',
      '!backend/**',
      '!web/**',
      '!docs/**',
      '!android/**',
      '!ios/**',
      '!lib/**',
      '!integration_test/**',
      '!test/**',
      '!postman/**',
      '!node_modules/.cache/**',
    ],
    extraMetadata: {
      main: 'desktop/main.cjs',
      version: '1.0.0',
      name: 'biotrack-healthcare-desktop',
      productName: 'BioTrack',
    },
    asar: true,
    npmRebuild: false,
    mac: {
      category: 'public.app-category.medical',
      target: ['dmg'],
      icon: path.join(rootDir, 'desktop', 'assets', 'icon.icns'),
      artifactName: 'BioTrack-${version}-mac-${arch}.${ext}',
      darkModeSupport: true,
    },
    dmg: {
      icon: path.join(rootDir, 'desktop', 'assets', 'icon.icns'),
      artifactName: 'BioTrack-${version}-mac-${arch}.${ext}',
    },
    win: {
      target: [{ target: 'nsis', arch: ['x64'] }],
      icon: path.join(rootDir, 'desktop', 'assets', 'icon.ico'),
      artifactName: 'BioTrack-Setup-${version}-${arch}.${ext}',
      requestedExecutionLevel: 'asInvoker',
    },
    nsis: {
      oneClick: false,
      perMachine: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: 'BioTrack',
      installerIcon: path.join(rootDir, 'desktop', 'assets', 'icon.ico'),
      uninstallerIcon: path.join(rootDir, 'desktop', 'assets', 'icon.ico'),
      installerHeaderIcon: path.join(rootDir, 'desktop', 'assets', 'icon.ico'),
      artifactName: 'BioTrack-Setup-${version}-${arch}.${ext}',
    },
  };
}

async function main() {
  const targetPlatform = resolvePlatform();

  const targets =
    targetPlatform === 'mac'
      ? Platform.MAC.createTarget(['dmg'])
      : Platform.WINDOWS.createTarget(['nsis'], Arch.x64);

  console.log(`Building installer target: ${targetPlatform}`);

  const artifacts = await build({
    targets,
    config: createConfig(),
    publish: 'never',
  });

  console.log('Installer artifacts:');
  for (const artifact of artifacts) {
    console.log(`- ${artifact}`);
  }
}

main().catch((error) => {
  console.error('Failed to build installer:', error);
  process.exitCode = 1;
});
