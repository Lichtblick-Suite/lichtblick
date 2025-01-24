// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import WorkerSocketAdapter from "@lichtblick/suite-base/players/FoxgloveWebSocketPlayer/WorkerSocketAdapter";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

describe("WorkerSocketAdapter", () => {
  let mockWorker: Worker;
  let adapter: WorkerSocketAdapter;

  beforeEach(() => {
    mockWorker = {
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      // eslint-disable-next-line no-restricted-syntax
      onerror: null as ((event: ErrorEvent) => void) | null,
      // eslint-disable-next-line no-restricted-syntax
      onmessage: null as ((event: MessageEvent) => void) | null,
      // eslint-disable-next-line no-restricted-syntax
      onmessageerror: null as ((event: MessageEvent) => void) | null,
      postMessage: jest.fn(),
      removeEventListener: jest.fn(),
      terminate: jest.fn(),
    };

    global.Worker = jest.fn(() => mockWorker) as any;

    adapter = new WorkerSocketAdapter("ws://localhost:8080");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a Worker and send an open message", () => {
    expect(global.Worker).toHaveBeenCalledWith(expect.any(URL));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: "open",
      data: { wsUrl: "ws://localhost:8080", protocols: undefined },
    });
  });

  it("should handle open events from the Worker", () => {
    const onOpenMock = jest.fn();
    adapter.onopen = onOpenMock;

    const protocol = "test-protocol";
    mockWorker.onmessage?.({
      data: { type: "open", protocol },
    } as MessageEvent);

    expect(onOpenMock).toHaveBeenCalledWith({ type: "open", protocol });
    expect(adapter.protocol).toBe(protocol);
  });

  it("should not call onopen if it is undefined", () => {
    const protocol = "test-protocol";
    mockWorker.onmessage?.({
      data: { type: "open", protocol },
    } as MessageEvent);

    expect(adapter.onopen).toBeUndefined();
  });

  it("should handle close events from the Worker", () => {
    const onCloseMock = jest.fn();
    adapter.onclose = onCloseMock;

    mockWorker.onmessage?.({ data: { type: "close" } } as MessageEvent);

    expect(onCloseMock).toHaveBeenCalledWith({ type: "close" });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it("should handle error type events from the Worker", () => {
    const onErrorMock = jest.fn();
    adapter.onerror = onErrorMock;

    mockWorker.onmessage?.({ data: { type: "error" } } as MessageEvent);

    expect(onErrorMock).toHaveBeenCalledWith({ type: "error" });
  });

  it("should not call onerror if it is undefined", () => {
    mockWorker.onmessage?.({ data: { type: "error" } } as MessageEvent);

    expect(adapter.onerror).toBeUndefined();
  });

  it("should handle message type events from the Worker", () => {
    const onMessageMock = jest.fn();
    adapter.onmessage = onMessageMock;

    mockWorker.onmessage?.({ data: { type: "message" } } as MessageEvent);

    expect(onMessageMock).toHaveBeenCalledWith({ type: "message" });
  });

  it("should not call onmessage if it is undefined", () => {
    mockWorker.onmessage?.({ data: { type: "message" } } as MessageEvent);

    expect(adapter.onmessage).toBeUndefined();
  });

  it("should handle error events from the Worker", () => {
    const onErrorMock = jest.fn();
    adapter.onerror = onErrorMock;

    const errorEvent = { message: "error" } as ErrorEvent;
    mockWorker.onerror?.(errorEvent);

    expect(onErrorMock).toHaveBeenCalledWith(errorEvent);
  });

  it("should send data to the Worker", () => {
    const message = BasicBuilder.string();
    adapter.send(message);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: "data",
      data: message,
    });
  });

  it("should throw an error when sending data after the connection is closed", () => {
    mockWorker.onmessage?.({
      data: { type: "close" },
    } as MessageEvent);

    expect(() => {
      adapter.send("test-data");
    }).toThrow("Can't send message over closed websocket connection");
  });

  it("should send a close message to the Worker", () => {
    adapter.close();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: "close",
      data: undefined,
    });
  });

  it("shouldn't send a close message to the Worker because the connection is already closed", () => {
    mockWorker.onmessage?.({ data: { type: "close" } } as MessageEvent);
    adapter.close();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockWorker.postMessage).not.toHaveBeenCalledWith({
      type: "close",
      data: undefined,
    });
  });

  it("should call the onerror callback when defined and an error occurs", () => {
    const onErrorMock = jest.fn();
    adapter.onerror = onErrorMock;

    const errorEvent = { message: "error" } as ErrorEvent;
    mockWorker.onerror?.(errorEvent);

    expect(onErrorMock).toHaveBeenCalledWith(errorEvent);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
  });

  it("should do nothing when onerror is undefined and an error occurs", () => {
    adapter.onerror = undefined;

    const errorEvent = { message: "error" } as ErrorEvent;
    mockWorker.onerror?.(errorEvent);

    expect(adapter.onerror).toBeUndefined();
  });
});
