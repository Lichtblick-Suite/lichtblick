// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

module.exports = {
  packagerConfig: {
    dir: ".webpack",
    asar: true,
    icon: "resources/icon/icon.png",
    name: "Foxglove Studio",
    executableName: "foxglove-studio",
    appBundleId: "dev.foxglove.studio",
  },
  makers: [
    {
      name: "@electron-forge/maker-deb",
      platforms: ["linux"],
      config: {
        icon: "resources/icon/icon.png",
        scripts: {
          postinst: "resources/linux/deb/postinst",
        },
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      platforms: ["darwin"],
      config: {
        background: "resources/dmg-background/background.png",
        contents: (opts) => [
          { x: 144, y: 170, type: "file", path: opts.appPath },
          { x: 390, y: 170, type: "link", path: "/Applications" },
        ],
        additionalDMGOptions: {
          window: {
            size: { width: 540, height: 380 },
          },
        },
      },
    },
  ],
};
