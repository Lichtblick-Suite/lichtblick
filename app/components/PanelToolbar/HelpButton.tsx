//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

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
