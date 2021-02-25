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

import { DependencyList, useEffect } from "react";

// Instead of having `target` be an Element type we narrow the requirement to any instance
// which implements the addEventListener and removeElementListener methods.
// Thus allowing tests to provide mock target instances.
interface EventSource {
  addEventListener: Element["addEventListener"];
  removeEventListener: Element["removeEventListener"];
}

/** React Hook to add an event listener of @param type to element @param target.
 *  The event listener is removed when the component unmounts.
 */
export default function useEventListener(
  target: EventSource,
  type: string,
  enable: boolean,
  handler: (arg0: any) => void,
  dependencies: DependencyList,
) {
  useEffect(() => {
    if (enable) {
      target.addEventListener(type, handler);
      return () => target.removeEventListener(type, handler);
    }
    // The passed-in handler callback is expected to not need to change.
    // For call site ergonomics we exclude it from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, type, enable, ...dependencies]);
}
