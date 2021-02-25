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
import React, { createContext, useCallback, useState, useRef, ReactNode } from "react";

import { useMessagePipeline } from "@foxglove-studio/app/components/MessagePipeline";
import Logger from "@foxglove-studio/app/util/Logger";
import sendNotification from "@foxglove-studio/app/util/sendNotification";

const log = new Logger(__filename);

export const ScreenshotsContext = createContext<{
  takeScreenshot: (element: HTMLElement) => Promise<Blob | null | undefined>;
  isTakingScreenshot: boolean;
}>({
  takeScreenshot: () => {
    throw new Error("cannot take screenshot before initialization");
  },
  isTakingScreenshot: false,
});

// Must be nested in the <PlayerManager>.
export function ScreenshotsProvider({ children }: { children: ReactNode }) {
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);

  const pausePlayback = useMessagePipeline(
    useCallback((messagePipeline) => messagePipeline.pausePlayback, []),
  );

  // Use an additional ref here because we never want these callbacks to change.
  const isTakingScreenshotRef = useRef(isTakingScreenshot);
  isTakingScreenshotRef.current = isTakingScreenshot;

  const takeScreenshot = useCallback(
    async (element: HTMLElement): Promise<Blob | null | undefined> => {
      if (isTakingScreenshotRef.current) {
        return;
      }

      // We always pause playback when taking the screenshot.
      pausePlayback();
      setIsTakingScreenshot(true);

      let image;
      try {
        image = await domToImage.toBlob(element, { scrollFix: true });
      } catch (error) {
        log.error(error);
        sendNotification("Error taking screenshot", error.stack, "app", "error");
      } finally {
        setIsTakingScreenshot(false);
      }
      return image;
    },
    [pausePlayback],
  );

  const contextValue = {
    takeScreenshot,
    isTakingScreenshot,
  };

  return <ScreenshotsContext.Provider value={contextValue}>{children}</ScreenshotsContext.Provider>;
}
