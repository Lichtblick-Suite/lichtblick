//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import tick from "@foxglove-studio/app/shared/tick";

export async function dragAndDrop(
  source: (Element | null | undefined) | (() => Element | null | undefined),
  target: (Element | null | undefined) | (() => Element | null | undefined),
) {
  const sourceEl = typeof source === "function" ? source() : source;
  if (!sourceEl) {
    return;
  }

  sourceEl.dispatchEvent(new MouseEvent("dragstart", { bubbles: true }));
  await tick();
  sourceEl.dispatchEvent(new MouseEvent("dragenter", { bubbles: true }));
  await tick();

  const targetEl = typeof target === "function" ? target() : target;
  if (targetEl) {
    targetEl.dispatchEvent(new MouseEvent("dragover", { bubbles: true }));
    targetEl.dispatchEvent(new MouseEvent("drop", { bubbles: true }));
  }
  sourceEl.dispatchEvent(new MouseEvent("dragend", { bubbles: true }));
}