// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.
import * as React from "react";

import HelpModal from "@foxglove-studio/app/components/HelpModal";
import messagePathSyntax from "@foxglove-studio/app/components/MessagePathSyntax/index.help.md";
import renderToBody from "@foxglove-studio/app/components/renderToBody";
import helpContent from "@foxglove-studio/app/util/helpModalOpenSource.help.md";

export function showHelpModalOpenSource(event: React.MouseEvent<any> | null | undefined) {
  const modal = renderToBody(
    <HelpModal
      onRequestClose={() => modal.remove()}
    >{`${helpContent}\n\n#${messagePathSyntax}`}</HelpModal>,
  );
  if (event) {
    // If used as an onClick callback for links, disable the default link action.
    event.preventDefault();
  }
}
