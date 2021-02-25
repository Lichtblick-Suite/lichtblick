// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ReactDOM from "react-dom";

import "@foxglove-studio/app/styles/global.scss";

import installDevtoolsFormatters from "@foxglove-studio/app/util/installDevtoolsFormatters";
import overwriteFetch from "@foxglove-studio/app/util/overwriteFetch";
import waitForFonts from "@foxglove-studio/app/util/waitForFonts";
import { getGlobalConfig } from "@foxglove-studio/app/GlobalConfig";

import { App } from "@foxglove-studio/app/App";

installDevtoolsFormatters();
overwriteFetch();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("missing #root element");
}

async function main() {
  // consider moving waitForFonts into App to display an app loading screen
  await waitForFonts();

  // This should live within App and become part of startup
  await getGlobalConfig().load();

  ReactDOM.render(<App />, rootEl);
}

main();
