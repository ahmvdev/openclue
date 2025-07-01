/**
 * @type {import('electron-builder').Configuration}
 */

const config = {
  appId: "com.openclue.kai",
  productName: "OpenClue Kai",
  copyright: "Copyright © 2024 OpenClue Kai Contributors",
  asar: true,
  compression: "maximum",
  
  directories: {
    buildResources: "assets",
    output: "release",
  },
  
  files: [
    "app/**/*",
    "dist/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  
  extraResources: [
    {
      from: "assets/icons",
      to: "assets/icons",
      filter: ["**/*"]
    }
  ],
  
  win: {
    icon: "assets/icons/icon.ico",
    target: [
      {
        target: "nsis",
        arch: ["x64", "ia32"],
      },
      {
        target: "portable",
        arch: ["x64"],
      }
    ],
    publisherName: "OpenClue Kai Contributors"
  },
  
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    perMachine: false,
    installerIcon: "assets/icons/icon.ico",
    uninstallerIcon: "assets/icons/icon.ico",
    installerHeaderIcon: "assets/icons/icon.ico",
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "OpenClue Kai",
    license: "LICENSE"
  },
  
  mac: {
    category: "public.app-category.utilities",
    icon: "assets/icons/icon.icns",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "assets/entitlements.mac.plist",
    entitlementsInherit: "assets/entitlements.mac.plist",
    target: [
      {
        target: "dmg",
        arch: ["x64", "arm64"]
      },
      {
        target: "zip",
        arch: ["x64", "arm64"]
      }
    ]
  },
  
  dmg: {
    contents: [
      {
        x: 410,
        y: 150,
        type: "link",
        path: "/Applications"
      },
      {
        x: 130,
        y: 150,
        type: "file"
      }
    ],
    icon: "assets/icons/icon.icns"
  },
  
  linux: {
    icon: "assets/icons",
    category: "Utility",
    target: [
      {
        target: "AppImage",
        arch: ["x64"],
      },
      {
        target: "deb",
        arch: ["x64"],
      },
      {
        target: "snap",
        arch: ["x64"],
      }
    ],
    desktop: {
      Name: "OpenClue Kai",
      Comment: "AI-powered screen assistant",
      Categories: "Utility;",
      StartupNotify: "true"
    }
  },
  
  appImage: {
    artifactName: "${productName}-${version}-${arch}.AppImage"
  },
  
  publish: {
    provider: "github",
    owner: "openclue-kai",
    repo: "openclue-kai",
    private: false,
    releaseType: "release"
  }
}

module.exports = config;
