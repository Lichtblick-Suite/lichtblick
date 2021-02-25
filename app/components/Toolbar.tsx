//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { ReactNode, useCallback } from "react";

import styles from "./Toolbar.module.scss";

type Props = {
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onDoubleClick?: () => void;
};

function Toolbar(props: Props): React.ReactElement {
  const { style, className = "", onDoubleClick } = props;
  const clickHandler = useCallback(
    (event: React.MouseEvent) => {
      // Only process the click event if the toolbar itself was clicked, not e.g. a button
      if (event.currentTarget === event.target) {
        onDoubleClick?.();
      }
    },
    [onDoubleClick],
  );
  return (
    <div className={`${styles.toolbar} ${className}`} style={style} onDoubleClick={clickHandler}>
      {props.children}
    </div>
  );
}

Toolbar.displayName = "Toolbar";

export default Toolbar;
