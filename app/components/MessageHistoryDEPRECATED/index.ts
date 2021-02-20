//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useMemo } from "react";
import { Time } from "rosbag";

import { getTopicsFromPaths } from "@foxglove-studio/app/components/MessagePathSyntax/parseRosPath";
import {
  MessagePathDataItem,
  useDecodeMessagePathsForMessagesByTopic,
} from "@foxglove-studio/app/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import * as PanelAPI from "@foxglove-studio/app/PanelAPI";
import { Message } from "@foxglove-studio/app/players/types";
import { useShallowMemo } from "@foxglove-studio/app/util/hooks";

export type MessageHistoryItem = {
  queriedData: MessagePathDataItem[];
  message: Message;
};

export type MessageHistoryItemsByPath = Readonly<{
  [key: string]: ReadonlyArray<MessageHistoryItem>;
}>;

export type MessageHistoryData = {
  itemsByPath: MessageHistoryItemsByPath;
  startTime: Time;
};

type Props = {
  children: (arg0: MessageHistoryData) => Node;
  paths: string[];
  historySize?: number;
};

const ZERO_TIME = Object.freeze({ sec: 0, nsec: 0 });

// DEPRECATED in favor of PanelAPI.useMessagesByTopic and useCachedGetMessagePathDataItems.
//
// Be sure to pass in a new render function when you want to force a rerender.
// So you probably don't want to do `<MessageHistoryDEPRECATED>{this._renderSomething}</MessageHistoryDEPRECATED>`.
// This might be a bit counterintuitive but we do this since performance matters here.
// @ts-expect-error something about missing elements for Node .. blah .. just delete this component!
export default React.memo<Props>(function MessageHistoryDEPRECATED({
  // eslint-disable-next-line react/prop-types
  children,
  // eslint-disable-next-line react/prop-types
  paths,
  // eslint-disable-next-line react/prop-types
  historySize,
}: Props) {
  const { startTime } = PanelAPI.useDataSourceInfo();
  const memoizedPaths: string[] = useShallowMemo<string[]>(paths);
  const subscribeTopics = useMemo(() => getTopicsFromPaths(memoizedPaths), [memoizedPaths]);

  const messagesByTopic = PanelAPI.useMessagesByTopic({
    topics: subscribeTopics,
    historySize: historySize || Infinity,
  });

  const decodeMessagePathsForMessagesByTopic = useDecodeMessagePathsForMessagesByTopic(
    memoizedPaths,
  );
  const itemsByPath = useMemo(() => decodeMessagePathsForMessagesByTopic(messagesByTopic), [
    decodeMessagePathsForMessagesByTopic,
    messagesByTopic,
  ]);

  return useMemo(() => children({ itemsByPath, startTime: startTime || ZERO_TIME }), [
    children,
    itemsByPath,
    startTime,
  ]);
});
