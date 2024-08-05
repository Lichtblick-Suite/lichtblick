// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { threeDee } from "@lichtblick/suite-base/i18n/en";
import { t } from "i18next";

export const t3D = (threeDeeKey: keyof typeof threeDee): string => t(`threeDee:${threeDeeKey}`);
