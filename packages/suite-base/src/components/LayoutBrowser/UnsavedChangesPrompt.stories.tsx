// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { UnsavedChangesPrompt } from "@lichtblick/suite-base/components/LayoutBrowser/UnsavedChangesPrompt";
import { LayoutID } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { defaultPlaybackConfig } from "@lichtblick/suite-base/providers/CurrentLayoutProvider/reducers";
import { Layout, ISO8601Timestamp } from "@lichtblick/suite-base/services/ILayoutStorage";
import { action } from "@storybook/addon-actions";
import { StoryObj } from "@storybook/react";

export default {
  title: "components/LayoutBrowser/UnsavedChangesPrompt",
  component: UnsavedChangesPrompt,
  parameters: { colorScheme: "dark" },
};

const dummyLayout: Layout = {
  id: "dummy-id" as LayoutID,
  name: "Example layout",
  permission: "ORG_WRITE",
  baseline: {
    savedAt: new Date(10).toISOString() as ISO8601Timestamp,
    data: {
      configById: {},
      globalVariables: {},
      userNodes: {},
      playbackConfig: defaultPlaybackConfig,
    },
  },
  working: undefined,
  syncInfo: undefined,
};

export const Default: StoryObj = {
  render: () => {
    return <UnsavedChangesPrompt isOnline layout={dummyLayout} onComplete={action("onComplete")} />;
  },
};

export const DefaultLight: StoryObj = { ...Default, parameters: { colorScheme: "light" } };

export const Offline: StoryObj = {
  render: () => {
    return (
      <UnsavedChangesPrompt
        isOnline={false}
        layout={dummyLayout}
        onComplete={action("onComplete")}
      />
    );
  },
};

export const Overwrite: StoryObj = {
  render: () => {
    return (
      <UnsavedChangesPrompt
        isOnline
        layout={dummyLayout}
        onComplete={action("onComplete")}
        defaultSelectedKey="overwrite"
      />
    );
  },
};

export const MakePersonal: StoryObj = {
  render: () => {
    return (
      <UnsavedChangesPrompt
        isOnline
        layout={dummyLayout}
        onComplete={action("onComplete")}
        defaultSelectedKey="makePersonal"
      />
    );
  },
};

export const MakePersonalWithEmptyField: StoryObj = {
  render: () => {
    return (
      <UnsavedChangesPrompt
        isOnline
        layout={dummyLayout}
        onComplete={action("onComplete")}
        defaultSelectedKey="makePersonal"
        defaultPersonalCopyName=""
      />
    );
  },
};
