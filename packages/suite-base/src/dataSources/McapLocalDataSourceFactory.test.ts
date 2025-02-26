// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { DataSourceFactoryInitializeArgs } from "@lichtblick/suite-base/context/PlayerSelectionContext";
import { WorkerIterableSource } from "@lichtblick/suite-base/players/IterablePlayer";
import { IterablePlayer } from "@lichtblick/suite-base/players/IterablePlayer";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import McapLocalDataSourceFactory from "./McapLocalDataSourceFactory";

const MCAP_ACCEPT_TYPE = "application/octet-stream";
const MCAP_LOCAL_FILE_ID = "mcap-local-file";

// Worker mock to avoid real execution in tests
global.Worker = jest.fn().mockImplementation(() => ({
  postMessage: jest.fn(),
  terminate: jest.fn(),
}));

jest.mock("@lichtblick/suite-base/players/IterablePlayer", () => ({
  WorkerIterableSource: jest.fn(),
  IterablePlayer: jest.fn(),
}));

describe("McapLocalDataSourceFactory", () => {
  let factory: McapLocalDataSourceFactory;

  beforeEach(() => {
    factory = new McapLocalDataSourceFactory();
    jest.clearAllMocks();
  });

  function buildMcapFile(): File {
    return new File([BasicBuilder.string()], `${BasicBuilder.string()}.mcap`, {
      type: MCAP_ACCEPT_TYPE,
    });
  }

  function setup({ file, files }: Pick<DataSourceFactoryInitializeArgs, "files" | "file">) {
    const args: DataSourceFactoryInitializeArgs = {
      file,
      files,
      metricsCollector: jest.fn(),
    } as unknown as DataSourceFactoryInitializeArgs;

    return {
      args,
    };
  }

  it("should create a IterablePlayer with one file", () => {
    const files = [buildMcapFile()];
    const { args } = setup({ files });

    const player = factory.initialize(args);

    expect(WorkerIterableSource).toHaveBeenCalledWith({
      initWorker: expect.any(Function),
      initArgs: { files },
    });
    expect(IterablePlayer).toHaveBeenCalledWith({
      metricsCollector: args.metricsCollector,
      source: expect.any(Object),
      name: files[0]!.name,
      sourceId: MCAP_LOCAL_FILE_ID,
    });
    expect(player).toBeInstanceOf(IterablePlayer);
  });

  it("should create a IterablePlayer with multiple files", () => {
    const files = [buildMcapFile(), buildMcapFile()];
    const { args } = setup({ files });

    const player = factory.initialize(args);

    expect(WorkerIterableSource).toHaveBeenCalledWith({
      initWorker: expect.any(Function),
      initArgs: { files },
    });
    expect(IterablePlayer).toHaveBeenCalledWith({
      metricsCollector: args.metricsCollector,
      source: expect.any(Object),
      name: `${files[0]!.name},${files[1]!.name}`,
      sourceId: MCAP_LOCAL_FILE_ID,
    });
    expect(player).toBeInstanceOf(IterablePlayer);
  });

  it("should return undefined when no files are provided", () => {
    const { args } = setup({ files: undefined });

    const player = factory.initialize(args);

    expect(player).toBeUndefined();
    expect(WorkerIterableSource).not.toHaveBeenCalled();
    expect(IterablePlayer).not.toHaveBeenCalled();
  });

  it("should handle one file", () => {
    const file = buildMcapFile();
    const { args } = setup({ file });

    const player = factory.initialize(args);

    expect(WorkerIterableSource).toHaveBeenCalledWith({
      initWorker: expect.any(Function),
      initArgs: { files: [file] },
    });
    expect(IterablePlayer).toHaveBeenCalledWith({
      metricsCollector: args.metricsCollector,
      source: expect.any(Object),
      name: file.name,
      sourceId: MCAP_LOCAL_FILE_ID,
    });
    expect(player).toBeInstanceOf(IterablePlayer);
  });

  it("should handle file and files", () => {
    const file = buildMcapFile();
    const files = [buildMcapFile()];
    const { args } = setup({ file, files });

    const player = factory.initialize(args);

    expect(WorkerIterableSource).toHaveBeenCalledWith({
      initWorker: expect.any(Function),
      initArgs: { files: [file, files[0]] },
    });
    expect(IterablePlayer).toHaveBeenCalledWith({
      metricsCollector: args.metricsCollector,
      source: expect.any(Object),
      name: `${files[0]?.name},${file.name}`,
      sourceId: MCAP_LOCAL_FILE_ID,
    });
    expect(player).toBeInstanceOf(IterablePlayer);
  });
});
