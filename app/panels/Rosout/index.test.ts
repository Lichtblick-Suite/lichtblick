// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { getShouldDisplayMsg } from "./index";

describe("RosOutPanel", () => {
  describe("getShouldDisplayMsg", () => {
    const msg = {
      topic: "/some_topic",
      receiveTime: { sec: 123, nsec: 456 },
      message: {
        msg: "Couldn't find int 83757.",
        level: 2,
        name: "/some_topic",
      },
    };

    describe("when minLogLevel is higher than msg level", () => {
      const minLogLevel = 3;
      it("returns false when minLogLevel is higher than msg level", () => {
        expect(getShouldDisplayMsg(msg, minLogLevel, [])).toEqual(false);
      });
    });

    describe("when minLogLevel lower than or equal to  msg level", () => {
      const minLogLevel = 1;

      it("returns true when searchTerms is empty", () => {
        expect(getShouldDisplayMsg(msg, minLogLevel, ["/some_topic"])).toEqual(true);
      });

      it("returns true when msg name contains search terms", () => {
        expect(getShouldDisplayMsg(msg, minLogLevel, ["some"])).toEqual(true);
      });

      it("returns true when msg contains search term", () => {
        expect(getShouldDisplayMsg(msg, minLogLevel, ["int"])).toEqual(true);
      });

      it("returns false when msg name doesn't contain any search terms", () => {
        expect(getShouldDisplayMsg(msg, minLogLevel, ["random"])).toEqual(false);
      });

      it("return true when minLogLevel equals msg level and msg contains search terms", () => {
        expect(getShouldDisplayMsg(msg, msg.message.level, ["int", "random"])).toEqual(true);
      });
    });
  });
});
