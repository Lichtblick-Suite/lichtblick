// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ReactElement, useEffect, useState } from "react";

import { OsContextSingleton } from "@foxglove-studio/app/OsContext";
import { FileContext } from "@foxglove-studio/app/components/FileContext";
import Root from "@foxglove-studio/app/components/Root";
import { usePrompt } from "@foxglove-studio/app/hooks/usePrompt";
import { ROSBRIDGE_WEBSOCKET_URL_QUERY_KEY } from "@foxglove-studio/app/util/globalConstants";

export function App(): ReactElement {
  const [bagFile, setBagFile] = useState<File | undefined>();
  const [isFullScreen, setFullScreen] = useState(false);
  const prompt = usePrompt();

  useEffect(() => {
    OsContextSingleton?.addWindowEventListener("enter-full-screen", () => setFullScreen(true));
    OsContextSingleton?.addWindowEventListener("leave-full-screen", () => setFullScreen(false));
  }, []);

  useEffect(() => {
    OsContextSingleton?.installMenuHandlers({
      "file.open-bag": () => {
        // The main thread simulated a mouse click for us which allows us to invoke input.click();
        // The idea is to move handling of opening the file to the renderer thread
        const input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("accept", ".bag");

        input.addEventListener(
          "input",
          () => {
            if (input.files?.length && input.files.length > 0) {
              setBagFile(input.files[0]);
            }
          },
          { once: true },
        );

        input.click();
      },
      "file.open-websocket-url": async () => {
        const result = await prompt("ws://localhost:9090");

        // Note(roman): Architecturally we should move the param handling out of nested components
        // like PlayerManager and feed in the data providers via context or up-tree components
        // This would simplify PlayerManager and add flexibility to the app at a more appropriate level
        // of abstraction.
        if (result) {
          const params = new URLSearchParams(window.location.search);
          params.set(ROSBRIDGE_WEBSOCKET_URL_QUERY_KEY, result);
          window.location.search = params.toString();
        }
      },
    });
  }, [prompt]);

  return (
    <>
      <FileContext.Provider value={bagFile}>
        <Root
          onToolbarDoubleClick={OsContextSingleton?.handleToolbarDoubleClick}
          windowStyle={
            OsContextSingleton?.platform === "darwin" ? "standaloneWithTopLeftButtons" : "normal"
          }
          isFullScreen={isFullScreen}
        />
      </FileContext.Provider>
    </>
  );
}
