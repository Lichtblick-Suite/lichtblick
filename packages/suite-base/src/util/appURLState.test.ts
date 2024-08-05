// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  AppURLState,
  updateAppURLState,
  parseAppURLState,
} from "@lichtblick/suite-base/util/appURLState";
import isDesktopApp from "@lichtblick/suite-base/util/isDesktopApp";

import { Time, toRFC3339String } from "@foxglove/rostime";

jest.mock("@lichtblick/suite-base/util/isDesktopApp", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockIsDesktop = isDesktopApp as jest.MockedFunction<typeof isDesktopApp>;

describe("app state url parser", () => {
  // Note that the foxglove URL here is different from actual foxglove URLs because Node's URL parser
  // interprets foxglove:// URLs differently than the browser does.
  describe.each([
    { isDesktop: true, urlBuilder: () => new URL("foxglove://host/open") },
    { isDesktop: false, urlBuilder: () => new URL("https://studio.foxglove.dev/") },
  ])("url tests", ({ isDesktop, urlBuilder }) => {
    beforeEach(() => mockIsDesktop.mockReturnValue(isDesktop));
    it("rejects non data state urls", () => {
      expect(parseAppURLState(urlBuilder())).toBeUndefined();
    });

    it("parses rosbag data state urls", () => {
      const url = urlBuilder();
      url.searchParams.append("ds", "ros1-remote-bagfile");
      url.searchParams.append("ds.url", "http://example.com");

      expect(parseAppURLState(url)).toMatchObject({
        ds: "ros1-remote-bagfile",
        dsParams: {
          url: "http://example.com",
        },
      });
    });

    it("parses data platform state urls", () => {
      const now: Time = { sec: new Date().getTime(), nsec: 0 };
      const time = toRFC3339String({ sec: now.sec + 500, nsec: 0 });
      const start = toRFC3339String(now);
      const end = toRFC3339String({ sec: now.sec + 1000, nsec: 0 });
      const url = urlBuilder();
      url.searchParams.append("ds", "foo");
      url.searchParams.append("time", time);
      url.searchParams.append("ds.bar", "barValue");
      url.searchParams.append("ds.baz", "bazValue");
      url.searchParams.append("ds.start", start);
      url.searchParams.append("ds.end", end);
      url.searchParams.append("ds.eventId", "dummyEventId");

      const parsed = parseAppURLState(url);
      expect(parsed).toMatchObject({
        ds: "foo",
        time: { sec: now.sec + 500, nsec: 0 },
        dsParams: { bar: "barValue", baz: "bazValue" },
      });
    });
  });
});

describe("app state encoding", () => {
  const baseURL = () => new URL("http://example.com");

  it("encodes rosbag urls", () => {
    expect(
      updateAppURLState(baseURL(), {
        time: undefined,
        ds: "ros1-remote-bagfile",
        dsParams: {
          url: "http://foxglove.dev/test.bag",
        },
      }).href,
    ).toEqual(
      "http://example.com/?ds=ros1-remote-bagfile&ds.url=http%3A%2F%2Ffoxglove.dev%2Ftest.bag",
    );
  });

  describe("url states", () => {
    const eventId = "dummyEventId";
    const time = undefined;
    it.each<AppURLState>([
      {
        time,
        ds: "ros1",
        dsParams: { url: "http://example.com:11311/test.bag", eventId },
      },
      {
        time,
        ds: "ros2",
        dsParams: { url: "http://example.com:11311/test.bag", eventId },
      },
      {
        time,
        ds: "ros1-remote-bagfile",
        dsParams: { url: "http://example.com/test.bag", eventId },
      },
      {
        time,
        ds: "rosbridge-websocket",
        dsParams: { url: "ws://foxglove.dev:9090/test.bag", eventId },
      },
    ])("encodes url state", (state) => {
      const url = state.dsParams?.url;
      const encodededURL = updateAppURLState(baseURL(), state).href;
      expect(encodededURL).toEqual(
        `http://example.com/?ds=${state.ds}&ds.eventId=${eventId}&ds.url=${encodeURIComponent(
          url ?? "",
        )}`,
      );
    });
  });
});
