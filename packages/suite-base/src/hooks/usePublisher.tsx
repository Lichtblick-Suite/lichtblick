// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { Immutable } from "@lichtblick/suite";
import { useMessagePipeline } from "@lichtblick/suite-base/components/MessagePipeline";
import { PlayerCapabilities } from "@lichtblick/suite-base/players/types";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";
import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

type Props = Immutable<{
  topic: string;
  schemaName?: string;
  datatypes: RosDatatypes;
  name: string;
}>;

// Registers a publisher with the player and returns a publish() function to publish data. This uses
// no-op functions if the player does not have the `advertise` capability
export default function usePublisher({
  topic,
  schemaName,
  datatypes,
  name,
}: Props): (msg: Record<string, unknown>) => void {
  const [id] = useState(() => uuidv4());
  const canPublish = useMessagePipeline((context) =>
    context.playerState.capabilities.includes(PlayerCapabilities.advertise),
  );
  const publish = useMessagePipeline((context) => context.publish);
  const setPublishers = useMessagePipeline((context) => context.setPublishers);
  useEffect(() => {
    if (canPublish && topic && schemaName) {
      setPublishers(id, [{ topic, schemaName, options: { datatypes } }]);
      return () => {
        setPublishers(id, []);
      };
    } else {
      return undefined;
    }
  }, [id, topic, schemaName, datatypes, name, setPublishers, canPublish]);

  return useCallback(
    (msg) => {
      if (canPublish) {
        publish({ topic, msg });
      }
    },
    [publish, topic, canPublish],
  );
}
