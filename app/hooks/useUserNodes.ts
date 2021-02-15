//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { useEffect } from "react";

// @ts-expect-error
import OrderedStampPlayer from "@foxglove-studio/app/players/OrderedStampPlayer";
import { UserNodes } from "@foxglove-studio/app/types/panels";

type Props = {
  nodePlayer: OrderedStampPlayer | null | undefined;
  userNodes: UserNodes;
};

const useUserNodes = ({ nodePlayer, userNodes }: Props) => {
  useEffect(() => {
    if (nodePlayer) {
      nodePlayer.setUserNodes(userNodes);
    }
  }, [userNodes, nodePlayer]);

  return null;
};

export default useUserNodes;
