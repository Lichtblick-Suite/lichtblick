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

import SendNotificationToastAdapter from "@lichtblick/suite-base/components/SendNotificationToastAdapter";
import StudioToastProvider from "@lichtblick/suite-base/components/StudioToastProvider";
import sendNotification from "@lichtblick/suite-base/util/sendNotification";
import { StoryFn, StoryObj } from "@storybook/react";
import { useEffect } from "react";

const fakeError = () => {
  const err = Error("This error is on purpose - it comes from the story");

  err.stack = `at http://localhost:49891/main.iframe.bundle.js:13051:22
      at finalStoryFn (http://localhost:49891/some_vendor_library-name_component-name-9a6f77.iframe.bundle.js:56275:32)
      at http://localhost:49891/some_vendor_library-name_component-name-9a6f77.iframe.bundle.js:53001:21
      at http://localhost:49891/some_vendor_library-name_component-name-9a6f77.iframe.bundle.js:54920:16
      at jsxDecorator (http://localhost:49891/some_vendor_library-name_component-name-9a6f77.iframe.bundle.js:48482:15)
      at http://localhost:49891/some_vendor_library-name_component-name-9a6f77.iframe.bundle.js:53001:21
      at http://localhost:49891/some_vendor_library-name_component-name-9a6f77.iframe.bundle.js:54884:12
      at http://localhost:49891/some_vendor_library-name_component-name-9a6f77.iframe.bundle.js:54920:16
      at withGrid (http://localhost:49891/some_vendor_library-name_component-name-9a6f77.iframe.bundle.js:45137:10)
      at http://localhost:49891/some_vendor_library-name_component-name-9a6f77.iframe.bundle.js:53001:21`;

  return err;
};

export default {
  title: "components/SendNotificationToastAdapter",
  component: SendNotificationToastAdapter,
  parameters: {
    chromatic: {
      delay: 100,
    },
    colorScheme: "dark",
  },
  decorators: [
    (Wrapped: StoryFn): JSX.Element => {
      return (
        <div style={{ padding: 10, height: "300px" }}>
          <StudioToastProvider>
            <Wrapped />
          </StudioToastProvider>
        </div>
      );
    },
  ],
};

export const OneError: StoryObj = {
  render: function Story() {
    useEffect(() => {
      sendNotification("Something bad happened", fakeError(), "app", "error");
    }, []);

    return <SendNotificationToastAdapter />;
  },
};

export const OneWarning: StoryObj = {
  render: function Story() {
    useEffect(() => {
      sendNotification(
        "This is the final countdown",
        "This warning is on purpose - it comes from the story",
        "app",
        "warn",
      );
    }, []);

    return <SendNotificationToastAdapter />;
  },
};

export const OneInfo: StoryObj = {
  render: function Story() {
    useEffect(() => {
      sendNotification(
        "Here's a helpful tip",
        "These are the details of the message",
        "user",
        "info",
      );
    }, []);

    return <SendNotificationToastAdapter />;
  },
};

export const MultipleMessages: StoryObj = {
  render: function Story() {
    useEffect(() => {
      sendNotification("Something bad happened 1", fakeError(), "app", "error");
      sendNotification("Here's a helpful tip", fakeError(), "user", "info");
      sendNotification(
        "Just a warning",
        "This warning is on purpose - it comes from the story",
        "app",
        "warn",
      );
      sendNotification("Something bad happened 2", fakeError(), "app", "error");
    }, []);

    return <SendNotificationToastAdapter />;
  },
};

export const MultipleMessagesLightTheme: StoryObj = {
  ...MultipleMessages,
  parameters: { colorScheme: "light" },
};
