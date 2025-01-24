// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { enqueueSnackbar } from "notistack";
import path from "path";
import { useCallback, useMemo } from "react";

import {
  IDataSourceFactory,
  usePlayerSelection,
} from "@lichtblick/suite-base/context/PlayerSelectionContext";
import showOpenFilePicker from "@lichtblick/suite-base/util/showOpenFilePicker";

export function useOpenFile(sources: readonly IDataSourceFactory[]): () => Promise<void> {
  const { selectSource } = usePlayerSelection();

  const allExtensions = useMemo(() => {
    return sources.reduce<string[]>((all, source) => {
      if (!source.supportedFileTypes) {
        return all;
      }

      return [...all, ...source.supportedFileTypes];
    }, []);
  }, [sources]);

  return useCallback(async () => {
    const filesHandles = await showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: allExtensions.join(", "),
          accept: { "application/octet-stream": allExtensions },
        },
      ],
    });

    if (filesHandles.length === 0) {
      return;
    }

    const processedFiles = await Promise.all(
      filesHandles.map(async (handle) => {
        const file = await handle.getFile();
        return {
          handle,
          file,
          extension: path.extname(file.name),
        };
      }),
    );

    const uniqueExtensions = new Set(processedFiles.map(({ extension }) => extension));
    if (uniqueExtensions.size > 1) {
      const message = `Multiple file extensions detected: ${[...uniqueExtensions].join(
        ", ",
      )}. All files must have the same extension.`;
      enqueueSnackbar(message, { variant: "error" });
      throw new Error(message);
    }

    const [extension] = uniqueExtensions;
    const matchingSources = sources.filter(
      (source) =>
        source.supportedFileTypes &&
        source.type === "file" &&
        source.supportedFileTypes.includes(extension!),
    );
    if (matchingSources.length > 1) {
      const message = `The file extension "${extension}" is not supported. Please select files with the following extensions: ${allExtensions.join(", ")}.`;
      enqueueSnackbar(message, { variant: "error" });
      throw new Error(message);
    }

    const foundSource = matchingSources[0];
    if (!foundSource) {
      const message = `Cannot find a source to handle files with extension ${extension}`;
      enqueueSnackbar(message, { variant: "error" });
      throw new Error(message);
    }

    selectSource(foundSource.id, { type: "file", files: processedFiles.map((item) => item.file) });
  }, [allExtensions, selectSource, sources]);
}
