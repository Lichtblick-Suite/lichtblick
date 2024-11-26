// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Stack, Typography as MuiTypography } from "@mui/material";
import { StoryObj } from "@storybook/react";
import { ReactNode } from "react";

export default {
  title: "Theme/Data Display/Typography",
};

function Wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <Stack sx={{ border: "1px dotted", borderColor: "info.main" }}>{children}</Stack>;
}

export const Variants: StoryObj = {
  render: function Story() {
    return (
      <Stack gap={1} padding={1}>
        <Wrapper>
          <MuiTypography variant="h1" gutterBottom>
            h1. Heading
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="h2" gutterBottom>
            h2. Heading
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="h3" gutterBottom>
            h3. Heading
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="h4" gutterBottom>
            h4. Heading
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="h5" gutterBottom>
            h5. Heading
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="h6" gutterBottom>
            h6. Heading
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="subtitle1" gutterBottom>
            subtitle1. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis
            tenetur
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="subtitle2" gutterBottom>
            subtitle2. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis
            tenetur
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="body1" gutterBottom>
            body1. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis tenetur
            unde suscipit, quam beatae rerum inventore consectetur, neque doloribus, cupiditate
            numquam dignissimos laborum fugiat deleniti? Eum quasi quidem quibusdam.
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="body2" gutterBottom>
            body2. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos blanditiis tenetur
            unde suscipit, quam beatae rerum inventore consectetur, neque doloribus, cupiditate
            numquam dignissimos laborum fugiat deleniti? Eum quasi quidem quibusdam.
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="button" display="block" gutterBottom>
            button text
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="caption" display="block" gutterBottom>
            caption text
          </MuiTypography>
        </Wrapper>
        <Wrapper>
          <MuiTypography variant="overline" display="block" gutterBottom>
            overline text
          </MuiTypography>
        </Wrapper>
      </Stack>
    );
  },
  parameters: { colorScheme: "light" },
};

const fontFeatures = [
  { label: "tnum", text: "0123456789" },
  { label: "calt", text: "=> == === 1x1 2*2 3xA ++ :=" },
  // we don't currently use these ligatures but putting it in just so we never forget it exists
  { label: "cv08 / cv10", text: "显示时间戳在" },
];

export const FontFeatureSettings: StoryObj = {
  render: () => (
    <table>
      <tbody>
        {fontFeatures.map(({ label, text }) => (
          <tr key={label}>
            <th style={{ width: 100 }}>{label}</th> <td>{text}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
  parameters: { colorScheme: "light" },
};

export const FontFeatureSettingsChinese: StoryObj = {
  ...FontFeatureSettings,
  parameters: { forceLanguage: "zh", colorScheme: "light" },
};

export const FontFeatureSettingsJapanese: StoryObj = {
  ...FontFeatureSettings,
  parameters: { forceLanguage: "ja", colorScheme: "light" },
};
