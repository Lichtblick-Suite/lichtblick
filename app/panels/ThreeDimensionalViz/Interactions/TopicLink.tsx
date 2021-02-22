//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import { usePanelContext } from "@foxglove-studio/app/components/PanelContext";
import Tooltip from "@foxglove-studio/app/components/Tooltip";
import RawMessages from "@foxglove-studio/app/panels/RawMessages/index";
import colors from "@foxglove-studio/app/styles/colors.module.scss";
import { PanelConfig } from "@foxglove-studio/app/types/panels";

const STopicLink = styled.span`
  cursor: pointer;
  color: ${colors.highlight};
`;

type Props = {
  topic: string;
};

export default function TopicLink({ topic }: Props) {
  const { openSiblingPanel } = usePanelContext();
  const openRawMessages = React.useCallback(() => {
    if (!openSiblingPanel) {
      return;
    }
    openSiblingPanel(
      RawMessages.panelType, // $FlowFixMe
      (config: PanelConfig) => ({ ...config, topicPath: topic }),
    );
  }, [openSiblingPanel, topic]);

  return (
    <Tooltip placement="top" contents={`View ${topic} in Raw Messages panel`}>
      {/* extra span to work around tooltip NaN positioning bug */}
      <span>
        <STopicLink onClick={openRawMessages}>{topic}</STopicLink>
      </span>
    </Tooltip>
  );
}
