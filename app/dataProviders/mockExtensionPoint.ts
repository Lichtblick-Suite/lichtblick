//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { ExtensionPoint } from "@foxglove-studio/app/dataProviders/types";

export function mockExtensionPoint() {
  const metadata: any[] = [];
  return {
    extensionPoint: {
      notifyPlayerManager: async () => {
        // no-op
      },
      progressCallback: () => {
        // no-op
      },
      reportMetadataCallback: (m) => {
        metadata.push(m);
      },
    } as ExtensionPoint,
    metadata,
  };
}
