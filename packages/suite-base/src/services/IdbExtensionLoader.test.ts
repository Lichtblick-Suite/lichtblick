// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import fs from "fs";
import { openDB } from "idb/with-async-ittr";

import { IdbExtensionLoader } from "./IdbExtensionLoader";

jest.mock("idb/with-async-ittr", () => ({
  openDB: jest.fn(),
}));

const pkgInfo = {
  description: "",
  devDependencies: {
    "@foxglove/fox": "file:../fox",
    "@foxglove/studio": "0.11.0",
    typescript: "4.3.2",
  },
  displayName: "turtlesim",
  id: "Foxglove Inc.studio-extension-turtlesim",
  license: "MPL-2.0",
  main: "./dist/extension.js",
  name: "studio-extension-turtlesim",
  publisher: "Foxglove Inc.",
  scripts: {
    build: "fox build",
    "foxglove:prepublish": "fox build --mode production",
    "local-install": "fox build && fox install",
    package: "fox build --mode production && fox package",
    pretest: "fox pretest",
  },
  version: "0.0.1",
};

const EXT_FILE_TURTLESIM = `${__dirname}/../test/fixtures/lichtblick.suite-extension-turtlesim-0.0.1.foxe`;
const EXT_FILE_PREFIXED = `${__dirname}/../test/fixtures/prefixed-name-extension.foxe`;

describe("IdbExtensionLoader", () => {
  const put = jest.fn();
  const getAll = jest.fn();

  beforeEach(() => {
    (openDB as jest.Mock).mockReturnValue({
      transaction: jest.fn().mockReturnValue({ db: { put } }),
      getAll,
    });
  });

  describe("loading extensions", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it("Installs local extensions", async () => {
      const foxe = fs.readFileSync(EXT_FILE_TURTLESIM);
      const expectedInfo = {
        ...pkgInfo,
        namespace: "local",
        qualifiedName: "turtlesim",
      };
      getAll.mockReturnValue([expectedInfo]);
      const loader = new IdbExtensionLoader("local");

      await loader.installExtension(foxe as unknown as Uint8Array);

      expect(put).toHaveBeenCalledWith("metadata", expectedInfo);
      expect(put).toHaveBeenCalledWith("extensions", { content: foxe, info: expectedInfo });
      expect((await loader.getExtensions())[0]).toBe(expectedInfo);
    });

    it("Installs private extensions", async () => {
      const foxe = fs.readFileSync(EXT_FILE_TURTLESIM);
      const expectedInfo = {
        ...pkgInfo,
        namespace: "org",
        qualifiedName: "org:Foxglove Inc:studio-extension-turtlesim",
      };
      getAll.mockReturnValue([expectedInfo]);
      const loader = new IdbExtensionLoader("org");

      await loader.installExtension(foxe as unknown as Uint8Array);

      expect(put).toHaveBeenCalledWith("metadata", expectedInfo);
      expect(put).toHaveBeenCalledWith("extensions", {
        content: foxe,
        info: expectedInfo,
      });
      expect((await loader.getExtensions())[0]).toBe(expectedInfo);
    });

    it("Parses package prefixes", async () => {
      const foxe = fs.readFileSync(EXT_FILE_PREFIXED);
      const expectedInfo = {
        id: "Prefix.package-name",
        name: "package-name",
        namespace: "org",
        publisher: "Prefix",
        qualifiedName: "org:Prefix:package-name",
      };

      getAll.mockReturnValue([expectedInfo]);
      const loader = new IdbExtensionLoader("org");

      await loader.installExtension(foxe as unknown as Uint8Array);

      expect(put).toHaveBeenCalledWith("metadata", expectedInfo);
      expect(put).toHaveBeenCalledWith("extensions", {
        content: foxe,
        info: expectedInfo,
      });
      expect((await loader.getExtensions())[0]).toBe(expectedInfo);
    });
  });
});
