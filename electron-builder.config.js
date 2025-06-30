/**
 * @type {import('electron-builder').Configuration}
 */

const config = {
  appId: "com.example.app",
  generateUpdatesFilesForAllChannels: true,
  // productName: `Example ${process.env.CHANNEL === 'beta' ? 'Beta' : ''}`,
  asar: true,
  directories: {
    buildResources: "public",
    output: "dist",
  },  
  artifactName: process.env.CHANNEL === 'beta' ? 'Setup-${productName}${version}.${ext}' : 'Setup-${productName}${version}.${ext}',
  win: {
    icon: 'public/icon.ico',
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
    ],
  },
  linux: {
    target: [
      {
        target: "deb",
        arch: ["x64"],
      },
      {
        target: "AppImage",
        arch: ["x64"],
      },
    ],
  },
}

module.exports = config;
