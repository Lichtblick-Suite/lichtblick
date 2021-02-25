// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

/** FileContext provides a way to send File instances down the tree */
const FileContext = createContext<File | undefined>(undefined);

export function useFileContext(): File | undefined {
  return useContext(FileContext);
}

export { FileContext };
