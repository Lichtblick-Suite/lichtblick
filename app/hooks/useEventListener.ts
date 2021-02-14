//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

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
  }, [target, type, enable, ...dependencies]);
}
