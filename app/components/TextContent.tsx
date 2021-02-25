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

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

import styles from "./TextContent.module.scss";
import { getGlobalHooks } from "@foxglove-studio/app/loadWebviz";
import { showHelpModalOpenSource } from "@foxglove-studio/app/util/showHelpModalOpenSource";

type Props = {
  children: React.ReactNode | string;
  linkTarget?: string;
  style?: {
    [key: string]: number | string;
  };
};

export default class TextContent extends React.Component<Props> {
  render() {
    const { children, linkTarget = undefined, style = {} } = this.props;

    // Make links in Markdown work with react-router.
    // Per https://github.com/rexxars/react-markdown/issues/29#issuecomment-275437798
    function renderLink(props: any) {
      if (
        getGlobalHooks().linkMessagePathSyntaxToHelpPage() &&
        props.href === "/help/message-path-syntax"
      ) {
        return (
          <a href="#" onClick={showHelpModalOpenSource}>
            {props.children}
          </a>
        );
      }

      return props.href.match(/^\//) ? (
        <Link to={props.href}>{props.children}</Link>
      ) : (
        <a href={props.href} target={linkTarget}>
          {props.children}
        </a>
      );
    }

    return (
      <div className={styles.root} style={style}>
        {typeof children === "string" ? (
          <ReactMarkdown source={children} renderers={{ link: renderLink }} />
        ) : (
          children
        )}
      </div>
    );
  }
}
