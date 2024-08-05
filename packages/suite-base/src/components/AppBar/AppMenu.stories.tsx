// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import PlayerSelectionContext, {
  PlayerSelection,
} from "@lichtblick/suite-base/context/PlayerSelectionContext";
import MockCurrentLayoutProvider from "@lichtblick/suite-base/providers/CurrentLayoutProvider/MockCurrentLayoutProvider";
import WorkspaceContextProvider from "@lichtblick/suite-base/providers/WorkspaceContextProvider";
import { PopoverPosition, PopoverReference } from "@mui/material";
import { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/testing-library";
import * as _ from "lodash-es";

import { AppMenu } from "./AppMenu";

type StoryArgs = {
  handleClose: () => void;
  anchorEl?: HTMLElement;
  anchorReference?: PopoverReference;
  anchorPosition?: PopoverPosition;
  disablePortal?: boolean;
  open: boolean;
  testId?: string;
};

export default {
  title: "components/AppBar/AppMenu",
  component: AppMenu,
  args: {
    open: true,
    anchorPosition: { top: 0, left: 0 },
    anchorReference: "anchorPosition",
    disablePortal: true,
    handleClose: _.noop,
  },
  decorators: [
    (Story, { args: { testId: _testId, ...args } }): JSX.Element => (
      <MockCurrentLayoutProvider>
        <WorkspaceContextProvider>
          <PlayerSelectionContext.Provider value={playerSelection}>
            <Story {...args} />
          </PlayerSelectionContext.Provider>
        </WorkspaceContextProvider>
      </MockCurrentLayoutProvider>
    ),
  ],
  play: async ({ canvasElement, args }) => {
    if (!args.testId) {
      return;
    }
    const canvas = within(canvasElement);
    await userEvent.hover(await canvas.findByTestId(args.testId));
  },
} satisfies Meta<StoryArgs>;

// Connection
const playerSelection: PlayerSelection = {
  selectSource: () => {},
  selectRecent: () => {},
  recentSources: [
    // prettier-ignore
    { id: "1111", title: "NuScenes-v1.0-mini-scene-0655-reallllllllly-long-name-8829908290831091.bag", },
    { id: "2222", title: "http://localhost:11311", label: "ROS 1" },
    { id: "3333", title: "ws://localhost:9090/", label: "Rosbridge (ROS 1 & 2)" },
    { id: "4444", title: "ws://localhost:8765", label: "Foxglove WebSocket" },
    { id: "5555", title: "2369", label: "Velodyne Lidar" },
    { id: "6666", title: "THIS ITEM SHOULD BE HIDDEN IN STORYBOOKS", label: "!!!!!!!!!!!!" },
  ],
  availableSources: [],
};

type Story = StoryObj<StoryArgs>;

export const Default: Story = {};

export const FileMenuDark: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "dark" },
};

export const FileMenuDarkChinese: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "dark", forceLanguage: "zh" },
};

export const FileMenuDarkJapanese: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "dark", forceLanguage: "ja" },
};

export const FileMenuLight: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "light" },
};

export const FileMenuLightChinese: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "light", forceLanguage: "zh" },
};

export const FileMenuLightJapanese: Story = {
  args: { testId: "app-menu-file" },
  parameters: { colorScheme: "light", forceLanguage: "ja" },
};

export const ViewMenuDark: Story = {
  args: { testId: "app-menu-view" },
  parameters: { colorScheme: "dark" },
};

export const ViewMenuDarkChinese: Story = {
  args: { testId: "app-menu-view" },
  parameters: { colorScheme: "dark", forceLanguage: "zh" },
};

export const ViewMenuDarkJapanese: Story = {
  args: { testId: "app-menu-view" },
  parameters: { colorScheme: "dark", forceLanguage: "ja" },
};

export const ViewMenuLight: Story = {
  args: { testId: "app-menu-view" },
  parameters: { colorScheme: "light" },
};

export const ViewMenuLightChinese: Story = {
  args: { testId: "app-menu-view" },
  parameters: { colorScheme: "light", forceLanguage: "zh" },
};

export const ViewMenuLightJapanese: Story = {
  ...ViewMenuLight,
  parameters: { colorScheme: "light", forceLanguage: "ja" },
};

export const HelpMenuDark: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "dark" },
};

export const HelpMenuDarkChinese: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "dark", forceLanguage: "zh" },
};

export const HelpMenuDarkJapanese: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "dark", forceLanguage: "ja" },
};

export const HelpMenuLight: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "light" },
};

export const HelpMenuLightChinese: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "light", forceLanguage: "zh" },
};

export const HelpMenuLightJapanese: Story = {
  args: { testId: "app-menu-help" },
  parameters: { colorScheme: "light", forceLanguage: "ja" },
};
