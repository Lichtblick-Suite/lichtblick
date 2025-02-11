// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import fs from "fs";
import os from "os";
import path from "path";

import { allowedExtensions } from "./constants";
import { CLIFlags } from "../common/types";

const SOURCE_PARAMETER = "source";

export function getFilesFromDirectory(arg: string): string[] {
  try {
    return fs
      .readdirSync(arg)
      .filter((file) =>
        allowedExtensions.some((extension) => file.toLocaleLowerCase().endsWith(extension)),
      );
  } catch (err) {
    console.error(err);
  }
  return [];
}

export function isPathToDirectory(paths: string[]): boolean {
  if (paths.length !== 1) {
    return false;
  }
  try {
    return fs.statSync(paths[0]!).isDirectory();
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function resolveSourcePaths(cliFlags: CLIFlags): string[] {
  const sourceParameter = cliFlags[SOURCE_PARAMETER];

  if (!sourceParameter) {
    return [];
  }

  const paths: string[] = sourceParameter
    .split(",")
    .map((filePath) => filePath.trim())
    .filter(Boolean);

  const resolvedFilePaths: string[] = paths
    .map((filePath) =>
      filePath.startsWith("~") ? path.join(os.homedir(), filePath.slice(1)) : filePath,
    )
    .map((filePath) => path.resolve(filePath));

  const filesToOpen: string[] = [];

  if (isPathToDirectory(resolvedFilePaths)) {
    const sourcePath = resolvedFilePaths[0]!;

    const directoryFiles = getFilesFromDirectory(sourcePath);
    const resolvedDirectoryFiles = directoryFiles.map((fileName) =>
      path.join(sourcePath, fileName),
    );
    filesToOpen.push(...resolvedDirectoryFiles);
  } else {
    filesToOpen.push(...resolvedFilePaths);
  }

  return filesToOpen;
}
