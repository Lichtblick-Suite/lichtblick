// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Topic } from "@lichtblick/suite-base/players/types";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";

export type TransformArgs = {
  name: string;
  sourceCode: string;
  topics: Topic[];
  rosLib: string;
  typesLib: string;
  datatypes: RosDatatypes;
};
