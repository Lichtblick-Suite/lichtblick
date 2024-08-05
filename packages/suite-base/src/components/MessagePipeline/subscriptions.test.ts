// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { mergeSubscriptions } from "@lichtblick/suite-base/components/MessagePipeline/subscriptions";
import { SubscribePayload } from "@lichtblick/suite-base/players/types";

describe("mergeSubscriptions", () => {
  it("combines full and partial subscriptions", () => {
    const subs: SubscribePayload[] = [
      { topic: "a", preloadType: "full" },
      { topic: "a", preloadType: "partial" },
    ];

    const result = mergeSubscriptions(subs);

    expect(result).toEqual([
      { topic: "a", preloadType: "full" },
      { topic: "a", preloadType: "partial" },
    ]);
  });

  it("combines full and partial and sliced subscriptions", () => {
    const subs: SubscribePayload[] = [
      { topic: "a", preloadType: "full" },
      { topic: "a", preloadType: "partial" },
      { topic: "a", preloadType: "partial", fields: ["one", "two"] },
    ];

    const result = mergeSubscriptions(subs);

    expect(result).toEqual([
      { topic: "a", preloadType: "full" },
      { topic: "a", preloadType: "partial" },
    ]);
  });

  it("excludes empty slices", () => {
    const subs: SubscribePayload[] = [
      { topic: "b", preloadType: "full", fields: ["one", "two"] },
      { topic: "b", preloadType: "partial", fields: ["one", "two", "three"] },
      { topic: "c", preloadType: "partial", fields: [] },
    ];

    const result = mergeSubscriptions(subs);

    expect(result).toEqual([
      { topic: "b", preloadType: "full", fields: ["one", "two"] },
      { topic: "b", preloadType: "partial", fields: ["one", "two", "three"] },
    ]);
  });

  it("switches to subscribing to all fields", () => {
    const subs: SubscribePayload[] = [
      { topic: "a", preloadType: "partial", fields: ["one", "two"] },
      { topic: "a", preloadType: "full", fields: ["one", "two"] },
      { topic: "a", preloadType: "partial" },
    ];

    const result = mergeSubscriptions(subs);

    expect(result).toEqual([
      { topic: "a", preloadType: "full", fields: ["one", "two"] },
      { topic: "a", preloadType: "partial" },
    ]);
  });

  it("switches to subscribing to all fields across preloadType", () => {
    const subs: SubscribePayload[] = [
      { topic: "a", preloadType: "partial", fields: ["one", "two"] },
      { topic: "a", preloadType: "full" },
    ];

    const result = mergeSubscriptions(subs);

    expect(result).toEqual([
      { topic: "a", preloadType: "full" },
      { topic: "a", preloadType: "partial" },
    ]);
  });
});
