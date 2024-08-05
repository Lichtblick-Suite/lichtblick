// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Logger from "@lichtblick/log";
import { initI18n } from "@lichtblick/suite-base";
import ReactDOM from "react-dom";

const log = Logger.getLogger(__filename);
log.debug("initializing");

window.onerror = (...args) => {
  console.error(...args);
};

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("missing #root element");
}

async function main() {
  const { overwriteFetch, waitForFonts } = await import("@lichtblick/suite-base");
  overwriteFetch();
  // consider moving waitForFonts into App to display an app loading screen
  await waitForFonts();

  await initI18n();

  const { Root } = await import("./Root");

  // eslint-disable-next-line react/no-deprecated
  ReactDOM.render(<Root />, rootEl);
}

void main();
