//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export type Node = {
  id: string;
  legacyIds: string[];
  text: string;
  tooltip: React.ReactNode[] | null | undefined;
  icon: React.ReactNode;
  checked: boolean;
  disabled: boolean;
  expanded: boolean;
  visible: boolean;
  filtered: boolean;
  missing: boolean;
  children: any[];
  canEdit: boolean;
  hasEdit: boolean;
  hasCheckbox: boolean;
  name: any;
  topic: any;
  namespace: any;
};
