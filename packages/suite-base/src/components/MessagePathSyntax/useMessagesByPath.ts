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

import { filterMap } from "@lichtblick/den/collection";
import { useShallowMemo } from "@lichtblick/hooks";
import * as PanelAPI from "@lichtblick/suite-base/PanelAPI";
import {
  MessageDataItemsByPath,
  useDecodeMessagePathsForMessagesByTopic,
} from "@lichtblick/suite-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import { subscribePayloadFromMessagePath } from "@lichtblick/suite-base/players/subscribePayloadFromMessagePath";
import { useMemo } from "react";

// Given a set of message paths, subscribe to the appropriate topics and return
// messages with their queried data decoded for each path.
export default function useMessagesByPath(
  paths: string[],
  historySize: number = Infinity,
): MessageDataItemsByPath {
  const memoizedPaths: string[] = useShallowMemo(paths);
  const subscribeTopics = useMemo(
    () => filterMap(memoizedPaths, (path) => subscribePayloadFromMessagePath(path)),
    [memoizedPaths],
  );

  const messagesByTopic = PanelAPI.useMessagesByTopic({
    topics: subscribeTopics,
    historySize,
  });

  const decodeMessagePathsForMessagesByTopic =
    useDecodeMessagePathsForMessagesByTopic(memoizedPaths);
  return useMemo(
    () => decodeMessagePathsForMessagesByTopic(messagesByTopic),
    [decodeMessagePathsForMessagesByTopic, messagesByTopic],
  );
}
