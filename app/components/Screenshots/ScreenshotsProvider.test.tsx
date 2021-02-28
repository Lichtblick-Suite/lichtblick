// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2020-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import domToImage from "dom-to-image-more-scroll-fix";
import { mount } from "enzyme";
import { noop } from "lodash";
import React, { useContext } from "react";
import { act } from "react-dom/test-utils";

import { ScreenshotsProvider, ScreenshotsContext } from "./ScreenshotsProvider";
import { MockMessagePipelineProvider } from "@foxglove-studio/app/components/MessagePipeline";
import delay from "@foxglove-studio/app/shared/delay";
import signal from "@foxglove-studio/app/shared/signal";
import sendNotification from "@foxglove-studio/app/util/sendNotification";

jest.mock("dom-to-image-more-scroll-fix", () => {
  return {
    toBlob: jest.fn(),
  };
});

const defaultContext = {
  takeScreenshot: noop,
  isTakingScreenshot: false,
};

function ScreenshotConsumer({ context }: { context: any }) {
  const screenshotContext = useContext(ScreenshotsContext);
  Object.entries(screenshotContext).forEach(([key, value]) => {
    context[key] = value;
  });
  return null;
}

describe("ScreenshotsProvider", () => {
  it("works correctly with a valid element", async () => {
    const blob = new Blob();
    const resolveSignal = signal<Blob>();
    domToImage.toBlob.mockReturnValueOnce(resolveSignal);
    const context = { ...defaultContext };
    const pausePlayback = jest.fn();
    mount(
      <MockMessagePipelineProvider pausePlayback={pausePlayback}>
        <ScreenshotsProvider>
          <ScreenshotConsumer context={context} />
        </ScreenshotsProvider>
      </MockMessagePipelineProvider>,
    );
    expect(context.isTakingScreenshot).toEqual(false);
    expect(pausePlayback).not.toHaveBeenCalled();

    const element = document.createElement("div");
    await act(async () => {
      const returnedPromise = context.takeScreenshot(element);
      await delay(10);
      expect(context.isTakingScreenshot).toEqual(true);
      expect(pausePlayback).toHaveBeenCalled();

      resolveSignal.resolve(blob);
      const returnValue = await returnedPromise;
      expect(returnValue).toEqual(blob);
      expect(domToImage.toBlob).toHaveBeenCalledWith(element, { scrollFix: true });
      expect(context.isTakingScreenshot).toEqual(false);
    });
  });

  it("handles a dom-to-image error correctly", async () => {
    const context = { ...defaultContext };
    mount(
      <MockMessagePipelineProvider>
        <ScreenshotsProvider>
          <ScreenshotConsumer context={context} />
        </ScreenshotsProvider>
      </MockMessagePipelineProvider>,
    );

    domToImage.toBlob.mockImplementationOnce(() => {
      return Promise.reject("Dummy error");
    });
    const element = document.createElement("div");
    await act(async () => {
      const returnedPromise = context.takeScreenshot(element);

      const returnValue = await returnedPromise;
      expect(returnValue).toEqual(undefined);
      expect(context.isTakingScreenshot).toEqual(false);
      sendNotification.expectCalledDuringTest();
    });
  });
});
