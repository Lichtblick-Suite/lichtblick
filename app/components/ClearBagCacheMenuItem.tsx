//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import NukeIcon from "@mdi/svg/svg/nuke.svg";

// @ts-expect-error flow import has 'any' type
import Confirm from "@foxglove-studio/app/components/Confirm";
// @ts-expect-error flow import has 'any' type
import { useExperimentalFeature } from "@foxglove-studio/app/components/ExperimentalFeatures";
// @ts-expect-error flow import has 'any' type
import { Item } from "@foxglove-studio/app/components/Menu";
import { clearIndexedDbWithoutConfirmation } from "@foxglove-studio/app/util/indexeddb/clearIndexedDb";

function clearIndexedDb() {
  const config = {
    prompt:
      "This will clear out all locally cached bag data from IndexedDB.\n\nUse this if you're having consistency or performance issues (but then please still report them to us!).\n\nThis will only work if you've closed all Webviz windows, since we cannot delete active databases.",
    ok: "Clear bag cache",
  };
  Confirm(config).then((okay: any) => {
    if (!okay) {
      return;
    }
    // From https://stackoverflow.com/a/54764150
    clearIndexedDbWithoutConfirmation().then(() => {
      window.location.reload();
    });
  });
}

export default function ClearBagCacheMenuItem() {
  if (!useExperimentalFeature("diskBagCaching")) {
    return null;
  }
  return (
    <Item icon={<NukeIcon />} onClick={clearIndexedDb}>
      Clear bag cache
    </Item>
  );
}
