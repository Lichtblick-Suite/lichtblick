// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { StoryObj } from "@storybook/react";
import { ReactElement, useLayoutEffect, useState } from "react";
import ReactDOM from "react-dom";

import { toSec } from "@foxglove/rostime";
import {
  Immutable,
  PanelExtensionContext,
  ParameterValue,
  RenderState,
  Time,
} from "@foxglove/studio";
import ErrorBoundary from "@foxglove/studio-base/components/ErrorBoundary";
import MockPanelContextProvider from "@foxglove/studio-base/components/MockPanelContextProvider";
import PanelSetup from "@foxglove/studio-base/stories/PanelSetup";

import PanelExtensionAdapter, { VERSION_CONFIG_KEY } from "./PanelExtensionAdapter";

export default {
  title: "PanelExtensionAdapter",
  component: PanelExtensionAdapter,
};

export const CatchRenderError: StoryObj = {
  render: () => {
    const initPanel = (context: PanelExtensionContext) => {
      context.watch("topics");

      context.onRender = () => {
        const err = new Error("sample render error");
        // The default stacktrace contains paths from the webpack bundle. These paths have the bundle
        // identifier/hash and change whenever the bundle changes. This makes the story change.
        // To avoid the story changing we set the stacktrace explicitly.
        err.stack = "sample stacktrace";
        throw err;
      };
    };

    return (
      <PanelSetup
        fixture={{
          topics: [
            {
              name: "/topic",
              schemaName: "test_msgs/Sample",
            },
          ],
          datatypes: new Map(),
          frame: {},
          layout: "UnknownPanel!4co6n9d",
        }}
      >
        <MockPanelContextProvider>
          <ErrorBoundary>
            <PanelExtensionAdapter config={{}} saveConfig={() => {}} initPanel={initPanel} />
          </ErrorBoundary>
        </MockPanelContextProvider>
      </PanelSetup>
    );
  },
};

function SimplePanel({ context }: { context: PanelExtensionContext }) {
  const [currentTime, setCurrentTime] = useState<Time | undefined>(undefined);
  const [parameters, setParameters] = useState<Immutable<Map<string, ParameterValue>>>(new Map());

  useLayoutEffect(() => {
    context.watch("currentTime");
    context.watch("parameters");
    context.onRender = (renderState: Immutable<RenderState>, done) => {
      setCurrentTime(renderState.currentTime);
      if (renderState.parameters != undefined) {
        setParameters(renderState.parameters);
      }
      done();
    };
  }, [context]);

  return (
    <div>
      <h2>Simple Panel</h2>
      <h3>Current Time</h3>
      <div>{currentTime ? toSec(currentTime) : "-"}</div>
      <h3>Parameters</h3>
      <div>{JSON.stringify(Array.from(parameters))}</div>
    </div>
  );
}

export const SimplePanelRender: StoryObj = {
  render: (): ReactElement => {
    function initPanel(context: PanelExtensionContext) {
      // eslint-disable-next-line react/no-deprecated
      ReactDOM.render(<SimplePanel context={context} />, context.panelElement);
    }

    return (
      <PanelSetup
        fixture={{
          datatypes: new Map(),
          frame: {},
          activeData: {
            currentTime: { sec: 1, nsec: 2 },
            parameters: new Map([
              ["param1", "value1"],
              ["param2", "value2"],
            ]),
          },
          layout: "UnknownPanel!4co6n9d",
        }}
      >
        <MockPanelContextProvider>
          <PanelExtensionAdapter config={{}} saveConfig={() => {}} initPanel={initPanel} />
        </MockPanelContextProvider>
      </PanelSetup>
    );
  },
};

export const ConfigTooNew: StoryObj = {
  render: (): ReactElement => {
    function initPanel() {
      throw new Error("Should not be called");
    }

    return (
      <PanelSetup>
        <MockPanelContextProvider>
          <PanelExtensionAdapter
            highestSupportedConfigVersion={1}
            config={{ [VERSION_CONFIG_KEY]: 2 }}
            saveConfig={() => {}}
            initPanel={initPanel}
          />
        </MockPanelContextProvider>
      </PanelSetup>
    );
  },
};
