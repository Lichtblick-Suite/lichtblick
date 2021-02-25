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

import inScreenshotTests from "@foxglove-studio/app/stories/inScreenshotTests";

function prepareForScreenshots() {
  if (inScreenshotTests()) {
    // We have some animations here and there. Disable them for screenshots.
    // Per https://github.com/tsuyoshiwada/storybook-chrome-screenshot#disable-component-animation
    const style = document.createElement("style");
    style.innerHTML = `* {
      transition: none !important;
      animation: none !important;
      caret-color: transparent !important;
    }`;
    if (document.body) {
      document.body.appendChild(style);
    }
  }
}

export default prepareForScreenshots;
