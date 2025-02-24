// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import fs, { Dirent, Stats } from "fs";
import mockFs from "mock-fs";
import { DirectoryItems } from "mock-fs/lib/filesystem";
import os from "os";
import randomString from "randomstring";

import { getFilesFromDirectory, isPathToDirectory, resolveSourcePaths } from "./resolveSourcePaths";

type FileStructure = {
  name: string;
  content: string;
  extension: string;
};

function genericString(): string {
  return randomString.generate({ length: 6, charset: "alphanumeric" });
}

function buildFile(file: Partial<FileStructure> = {}): Pick<FileStructure, "name" | "content"> {
  return {
    name: `${genericString()}.${file.extension ?? "mcap"}`,
    content: genericString(),
    ...file,
  };
}

function buildPath(): string {
  return `${genericString()}/${genericString()}`;
}

function buildArgv(homeDir: string, path?: string): string[] {
  const electronPath = `~/${homeDir}lichtblick/node_modules/electron/dist/electron.exe`;
  return path ? [electronPath, "desktop/.webpack", path] : [electronPath, "desktop/.webpack"];
}

function setup(fsConfigOverride?: DirectoryItems) {
  const path = buildPath();
  const file1 = buildFile({ extension: "txt" });
  const file2 = buildFile({ extension: "txt" });
  const file3 = buildFile({ extension: "mcap" });
  const files = { file1, file2, file3 };
  const fsConfig: DirectoryItems = fsConfigOverride ?? {
    [path]: {
      [file1.name]: file1.content,
      [file2.name]: file2.content,
      [file3.name]: file3.content,
    },
  };

  mockFs(fsConfig);

  return { fsConfig, path, files };
}

afterEach(() => {
  mockFs.restore();
});

describe("getFilesFromDirectory", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return only the .mcap files from the directory", () => {
    const { path, files } = setup();
    const mcapFiles = Object.values(files)
      .filter((file) => file.name.endsWith(".mcap"))
      .map((file) => file.name);

    const result = getFilesFromDirectory(path);

    expect(result).toEqual(mcapFiles);
  });

  it("should a return a empty array because the directory has no supported files", () => {
    const { path } = setup({
      [genericString()]: buildFile({ extension: "txt" }),
    });

    const result = getFilesFromDirectory(path);

    expect(result).toEqual([]);
  });

  it("should return an empty array when an error occurs in fs.readdirSync", () => {
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
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should return false cause there's more than one path", () => {
    const path1 = buildPath();
    const path2 = buildPath();
    setup({
      [path1]: {},
      [path2]: {},
    });

    const result = isPathToDirectory([path1, path2]);

    expect(result).toBe(false);
  });

  it("should return true because the path passed is a path to a directory", () => {
    const path1 = buildPath();
    setup({
      [path1]: {},
    });

    const result = isPathToDirectory([path1]);

    expect(result).toBe(true);
  });

  it("should return false when a error occurs", () => {
    const paths = [""];

    const result = isPathToDirectory(paths);

    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "ENOENT: no such file or directory, stat ''",
      }),
    );
  });
});

describe("resolveSourcePaths", () => {
  beforeEach(() => {
    jest.spyOn(os, "homedir").mockReturnValue(buildPath());
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should return an empty array because there was no files or a directory passed", () => {
    const homeDir = buildPath();
    const mockArgv = buildArgv(homeDir);

    const result = resolveSourcePaths(mockArgv);

    expect(result).toEqual([]);
  });

  it("should return an array with a single file passed through process.argv not using source CLI parameter", () => {
    const homeDir = buildPath();
    const file = buildFile({ extension: ".mcap" });
    const pathToFile = `~/${homeDir}/${file.name}`;
    const mockArgv = buildArgv(homeDir, pathToFile);

    const result = resolveSourcePaths(mockArgv);

    expect(result[0]).toContain(file.name);
  });

  it("should return an array with a single file passed through process.argv using source CLI parameter", () => {
    const homeDir = buildPath();
    const file = buildFile({ extension: ".mcap" });
    const pathToFile = `--source=~/${homeDir}/${file.name}`;
    const mockArgv = buildArgv(homeDir, pathToFile);

    const result = resolveSourcePaths(mockArgv);

    expect(result[0]).toContain(file.name);
  });

  it("should return an array with both files passed through process.argv not using source CLI parameter", () => {
    const homeDir = buildPath();
    const file1 = buildFile({ extension: ".mcap" });
    const file2 = buildFile({ extension: ".mcap" });
    const pathToFile = `~/${homeDir}/${file1.name},~/${homeDir}/${file2.name}`;
    const mockArgv = buildArgv(homeDir, pathToFile);

    const result = resolveSourcePaths(mockArgv);

    expect(result[0]).toContain(file1.name);
    expect(result[1]).toContain(file2.name);
  });

  it("should return an array with all files passed through process.argv using source CLI parameter", () => {
    const homeDir = buildPath();
    const file1 = buildFile({ extension: ".mcap" });
    const file2 = buildFile({ extension: ".mcap" });
    const file3 = buildFile({ extension: ".mcap" });
    const pathToFile = `--source=~/${homeDir}/${file1.name},~/${homeDir}/${file2.name},~/${homeDir}/${file3.name}`;
    const mockArgv = buildArgv(homeDir, pathToFile);

    const result = resolveSourcePaths(mockArgv);

    expect(result[0]).toContain(file1.name);
    expect(result[1]).toContain(file2.name);
    expect(result[2]).toContain(file3.name);
  });

  it("should return an empty array after getting a path to a directory with no mcap files while not using source CLI parameter", () => {
    jest.spyOn(fs, "statSync").mockReturnValueOnce({ isDirectory: () => true } as Stats);
    const homeDir = buildPath();
    const mockArgv = buildArgv(homeDir, homeDir);

    const result = resolveSourcePaths(mockArgv);

    expect(result).toEqual([]);
  });

  it("should return an empty array after getting a path to a directory with no mcap files while using source CLI parameter", () => {
    jest.spyOn(fs, "statSync").mockReturnValueOnce({ isDirectory: () => true } as Stats);
    const homePath = buildPath();
    const pathToFile = `--source=${homePath}`;
    const mockArgv = buildArgv(homePath, pathToFile);

    const result = resolveSourcePaths(mockArgv);

    expect(result).toEqual([]);
  });

  it("should return an array with mcap files after getting a path to a directory with multiple files, some being .mcap, while not using source CLI parameter", () => {
    const homeDir = buildPath();
    const file1 = buildFile({ extension: "mcap" });
    const file2 = buildFile({ extension: "bag" });
    const file3 = buildFile({ extension: "mcap" });
    jest.spyOn(fs, "statSync").mockReturnValueOnce({ isDirectory: () => true } as Stats);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValueOnce([file1.name, file3.name] as unknown as Dirent[]);

    setup({
      [homeDir]: {
        [file1.name]: file1.content,
        [file2.name]: file2.content,
        [file3.name]: file3.content,
      },
    });

    const mockArgv = buildArgv(homeDir, homeDir);

    const result = resolveSourcePaths(mockArgv);

    expect(result.length).toBe(2);
    expect(result[0]).toContain(file1.name);
    expect(result[1]).toContain(file3.name);
  });

  it("should return an array with mcap files after getting a path to a directory with multiple files, some being .mcap, while using source CLI parameter", () => {
    const homeDir = buildPath();
    const pathToFile = `--source=${homeDir}`;
    const file1 = buildFile({ extension: "bag" });
    const file2 = buildFile({ extension: "bag" });
    const file3 = buildFile({ extension: "mcap" });
    jest.spyOn(fs, "statSync").mockReturnValueOnce({ isDirectory: () => true } as Stats);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValueOnce([file1.name, file3.name] as unknown as Dirent[]);

    setup({
      [homeDir]: {
        [file1.name]: file1.content,
        [file2.name]: file2.content,
        [file3.name]: file3.content,
      },
    });

    const mockArgv = buildArgv(homeDir, pathToFile);

    const result = resolveSourcePaths(mockArgv);

    expect(result.length).toBe(1);
    expect(result[0]).toContain(file3.name);
  });
});
