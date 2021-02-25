// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import diff from "jest-diff";
import { isEqual } from "lodash";

// Always mock sendNotification and fail if it was called during the test without resetting it. Note that
// we have to do this here instead of in setup.js since here we have access to jest methods.
jest.mock("@foxglove-studio/app/util/sendNotification", () => {
  // Duplicate the report error functionality here with passing errors to handlers, if they exist.
  const fn: any = jest.fn((...args) => {
    if (fn.handler) {
      fn.handler(...args);
    }
  });
  fn.setNotificationHandler = (handler: any) => {
    fn.handler = handler;
  };
  // Ensure that there is no handler by default.
  fn.setNotificationHandler(null);
  return fn;
});

beforeEach(async () => {
  const sendNotification = await import("@foxglove-studio/app/util/sendNotification");
  (sendNotification as any).expectCalledDuringTest = () => {
    if ((sendNotification as any).mock.calls.length === 0) {
      // $FlowFixMe
      fail(
        "Expected sendNotification to have been called during the test, but it was never called!",
      ); // eslint-disable-line
    }
    (sendNotification as any).mockClear();
    // Reset the error handler to the default (no error handler).
    sendNotification.setNotificationHandler(null as any);
  };
});

afterEach(async () => {
  const sendNotification = await import("@foxglove-studio/app/util/sendNotification");

  if ((sendNotification as any).mock.calls.length > 0) {
    const calls = (sendNotification as any).mock.calls;
    (sendNotification as any).mockClear();
    // Reset the error handler to the default (no error handler).
    sendNotification.setNotificationHandler(null as any);
    // $FlowFixMe
    fail(
      `sendNotification has been called during this test (call sendNotification.expectCalledDuringTest(); at the end of your test if you expect this): ${JSON.stringify(
        calls,
      )}`,
    ); // eslint-disable-line
  }
});

// this file runs once jest has injected globals so you can modify the expect matchers
(global as any).expect.extend({
  // expects an array to contain exactly the other elements
  // in otherArray using isEqual
  toContainOnly(received: any, expectedArray: any) {
    const receivedArray = Array.from(received);
    let pass = true;
    if (receivedArray.length !== expectedArray.length) {
      pass = false;
    } else {
      for (const expectedItem of expectedArray) {
        if (!receivedArray.some((receivedItem) => isEqual(receivedItem, expectedItem))) {
          pass = false;
          break;
        }
      }
      for (const receivedItem of receivedArray) {
        if (!expectedArray.some((expectedItem: any) => isEqual(receivedItem, expectedItem))) {
          pass = false;
          break;
        }
      }
    }
    return {
      pass,
      actual: receivedArray,
      message: () => {
        const diffString = diff(expectedArray, receivedArray, { expand: this.expand });
        return `${this.utils.matcherHint(
          pass ? ".not.toContainOnly" : ".toContainOnly",
        )}\n\nExpected value${pass ? " not" : ""} to contain only:\n  ${this.utils.printExpected(
          expectedArray,
        )}\nReceived:\n  ${this.utils.printReceived(
          receivedArray,
        )}\n\nDifference:\n\n${diffString}`;
      },
    };
  },
});

describe("custom expectations", () => {
  describe("toContainOnly", () => {
    it("passes when arrays match", () => {
      expect([1]).toContainOnly([1]);
      // $FlowFixMe
      expect([1, 2]).not.toContainOnly([1]);
      // $FlowFixMe
      expect([2]).not.toContainOnly([1]);
      expect([{ foo: "bar" }]).toContainOnly([{ foo: "bar" }]);
      expect([{ foo: "bar" }, 2, { foo: "baz" }]).toContainOnly([
        2,
        { foo: "baz" },
        { foo: "bar" },
      ]);
    });

    it("throws when arrays do not match", () => {
      expect(() => {
        expect([{ foo: "bar" }]).toContainOnly([{ foo: "bar2" }]);
      }).toThrow();
      expect(() => {
        expect([{ foo: "bar" }]).toContainOnly([{ foo: "bar" }, { foo: "baz" }]);
      }).toThrow();
    });

    it("handles same-length arrays", () => {
      expect([1, 1]).toContainOnly([1, 1]);
      // $FlowFixMe
      expect([1, 1]).not.toContainOnly([1, 2]);
      // $FlowFixMe
      expect([1, 2]).not.toContainOnly([1, 1]);
    });
  });
});
