// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { LaunchPreferenceScreen } from "@lichtblick/suite-base/screens/LaunchPreferenceScreen";
import { StoryObj } from "@storybook/react";
import { ReactElement } from "react";

export default {
  title: "LaunchPreferenceScreen",
  component: LaunchPreferenceScreen,
};

export const Dark: StoryObj = {
  render: (): ReactElement => {
    return <LaunchPreferenceScreen />;
  },

  parameters: { colorScheme: "dark" },
};

export const Light: StoryObj = {
  render: (): ReactElement => {
    return <LaunchPreferenceScreen />;
  },

  parameters: { colorScheme: "light" },
};
