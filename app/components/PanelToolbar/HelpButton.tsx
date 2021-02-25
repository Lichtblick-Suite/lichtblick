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

import HelpCircleOutlineIcon from "@mdi/svg/svg/help-circle-outline.svg";
import { CSSProperties, ReactNode } from "react";

import styles from "./index.module.scss";
import HelpModal from "@foxglove-studio/app/components/HelpModal";
import Icon from "@foxglove-studio/app/components/Icon";
import renderToBody from "@foxglove-studio/app/components/renderToBody";

type Props = {
  children: ReactNode | string;
  iconStyle?: CSSProperties;
};

export default class HelpButton extends React.Component<Props> {
  render() {
    return (
      <Icon
        tooltip="Help"
        fade
        onClick={() => {
          const modal = renderToBody(
            <HelpModal onRequestClose={() => modal.remove()}>{this.props.children}</HelpModal>,
          );
        }}
      >
        <HelpCircleOutlineIcon className={styles.icon} style={this.props.iconStyle || {}} />
      </Icon>
    );
  }
}
