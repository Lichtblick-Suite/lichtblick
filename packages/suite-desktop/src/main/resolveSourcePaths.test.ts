// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import mockFs from "mock-fs";
import os from "os";

import { getFilesFromDirectory, isPathToDirectory, resolveSourcePaths } from "./resolveSourcePaths";

jest.mock("./StudioWindow", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../common/webpackDefines", () => ({
  LICHTBLICK_PRODUCT_NAME: "Lichtblick",
  LICHTBLICK_PRODUCT_VERSION: "1.0.0",
  LICHTBLICK_PRODUCT_HOMEPAGE: "https://lichtblick.com",
}));

function setupMockFileSystem(customStructure?: Record<string, any>) {
  const defaultStructure = {
    "/folder/mcap_files": {
      "file1.txt": "content",
      "file2.txt": "content",
      "file3.mcap": "mcap content",
    },
  };

  mockFs(customStructure ?? defaultStructure);
}

describe("getFilesFromDirectory", () => {
  afterEach(() => {
    mockFs.restore();
  });

  it("should return only the .mcap files from the directory", () => {
    setupMockFileSystem();
    const result = getFilesFromDirectory("/folder/mcap_files");

    expect(result).toEqual(["file3.mcap"]);
  });

  it("should a return a empty array because the directory has no allowed files", () => {
    setupMockFileSystem({
      "/empty_folder/mcap_files": {},
    });

    const result = getFilesFromDirectory("/empty_folder/mcap_files");

    expect(result).toEqual([]);
  });

  it("should return an empty array when an error occurs in fs.readdirSync", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = getFilesFromDirectory("");

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "ENOENT: no such file or directory, scandir ''",
      }),
    );

    consoleErrorSpy.mockRestore();
  });
});

describe("isPathToDirectory", () => {
  afterEach(() => {
    mockFs.restore();
  });

  it("should return false cause there's more than one path", () => {
    setupMockFileSystem({
      "/empty_folder/mcap_files": {},
      "/some_folder/mcap": {},
    });

    const mockPaths = ["/empty_folder/mcap_files", "/some_folder/mcap"];

    const result = isPathToDirectory(mockPaths);

    expect(result).toBe(false);
  });

  it("should return true because the path passed is a path to a directory", () => {
    setupMockFileSystem({
      "/empty_folder/mcap_files": {},
    });

    const mockPaths = ["/empty_folder/mcap_files"];

    const result = isPathToDirectory(mockPaths);

    expect(result).toBe(true);
  });

  it("should return false when a error occurs", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const mockPaths = [""];

    const result = isPathToDirectory(mockPaths);

    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "ENOENT: no such file or directory, stat ''",
      }),
    );

    consoleErrorSpy.mockRestore();
  });
});

describe("resolveSourcePaths", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it("should return an empty array because there was no source parameter provided", () => {
    const mockSourceParameter = undefined;

    const result = resolveSourcePaths(mockSourceParameter);

    expect(result).toEqual([]);
  });

  it("should return an array with a single path to a file", () => {
    const mockSourceParameter = "~/Folder/Mcap_folder/file.mcap";
    jest.spyOn(os, "homedir").mockReturnValue("/home/testuser");

    const result = resolveSourcePaths(mockSourceParameter);

    expect(result).toEqual(["C:\\home\\testuser\\Folder\\Mcap_folder\\file.mcap"]);
  });

  it("should return an array with multiple paths to files", () => {
    const mockSourceParameter = "~/Folder/Mcap_folder/file.mcap,~/Folder/Mcap_folder/file2.mcap,";
    jest.spyOn(os, "homedir").mockReturnValue("/home/testuser");

    const result = resolveSourcePaths(mockSourceParameter);

    expect(result).toEqual([
      "C:\\home\\testuser\\Folder\\Mcap_folder\\file.mcap",
      "C:\\home\\testuser\\Folder\\Mcap_folder\\file2.mcap",
    ]);
  });
});
