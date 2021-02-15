//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { CommentingActions } from "./commenting";
import { HoverValueActions } from "./hoverValue";
import { LayoutHistoryActions } from "./layoutHistory";
import { MosaicActions } from "./mosaic";
import { PanelsActions } from "./panels";
import { TestsActions } from "./tests";
import { UserNodesActions } from "./userNodes";

export type ActionTypes =
  | TestsActions
  | HoverValueActions
  | LayoutHistoryActions
  | MosaicActions
  | PanelsActions
  | UserNodesActions
  | CommentingActions;