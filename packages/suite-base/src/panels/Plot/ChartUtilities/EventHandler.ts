// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import EventEmitter from "eventemitter3";

type EventListenerHandler = (eventName: string, fn?: () => void) => void;

export function addEventListener(emitter: EventEmitter): EventListenerHandler {
  return (eventName: string, fn?: () => void): void => {
    const existing = emitter.listeners(eventName);
    if (!fn || existing.includes(fn)) {
      return;
    }

    emitter.on(eventName, fn);
  };
}

export function removeEventListener(emitter: EventEmitter): EventListenerHandler {
  return (eventName: string, fn?: () => void) => {
    if (fn) {
      emitter.off(eventName, fn);
    }
  };
}
