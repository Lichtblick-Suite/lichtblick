// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import WorkerSocketAdapter from "./WorkerSocketAdapter";

describe("WorkerSocketAdapter", () => {
  let workerMock: any;

  beforeEach(() => {
    workerMock = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: undefined as ((event: MessageEvent) => void) | undefined,
    };

    global.Worker = jest.fn(() => workerMock as unknown as Worker);

    new WorkerSocketAdapter("wss://example.com");
  });

  it("WorkerSocketAdapter should open a WebSocket connection", () => {
    workerMock.onmessage?.({ data: { type: "open", protocol: "json" } } as MessageEvent);

    expect(workerMock.postMessage).toHaveBeenCalledWith({
      type: "open",
      data: { wsUrl: "wss://example.com", protocols: undefined },
    });
  });

  it("WorkerSocketAdapter should close a WebSocket connection", () => {
    workerMock.onmessage?.({ data: { type: "close", data: {} } } as MessageEvent);

    expect(workerMock.terminate).toHaveBeenCalled();
  });

  it("WorkerSocketAdapter should send a message", () => {
    const socket = new WorkerSocketAdapter("wss://example.com");

    socket.send("Hello, World!");

    expect(workerMock.postMessage).toHaveBeenCalledWith({
      type: "data",
      data: "Hello, World!",
    });
  });

  it("WorkerSocketAdapter should handle an error", () => {
    workerMock.onmessage?.({
      data: { type: "error", error: "Something went wrong" },
    } as MessageEvent);

    expect(workerMock.postMessage).toHaveBeenCalledWith({
      type: "open",
      data: { wsUrl: "wss://example.com", protocols: undefined },
    });
  });

  it("WorkerSocketAdapter should handle a message", () => {
    workerMock.onmessage?.({
      data: { type: "message", data: BasicBuilder.string() },
    } as MessageEvent);

    expect(workerMock.postMessage).toHaveBeenCalledWith({
      type: "open",
      data: { wsUrl: "wss://example.com", protocols: undefined },
    });
  });
});
