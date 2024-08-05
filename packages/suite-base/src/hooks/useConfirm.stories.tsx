// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { StoryObj } from "@storybook/react";
import { useLayoutEffect } from "react";

import { useConfirm } from "./useConfirm";

export default {
  title: "hooks/useConfirm",
  parameters: { colorScheme: "dark" },
};

export const Defaults: StoryObj = {
  render: function Story() {
    const [confirm, confirmModal] = useConfirm();

    useLayoutEffect(() => {
      void confirm({
        title: "Example title",
      });
    }, [confirm]);

    return <>{confirmModal}</>;
  },
};

export const Primary: StoryObj = {
  render: function Story() {
    const [confirm, confirmModal] = useConfirm();

    useLayoutEffect(() => {
      void confirm({
        title: "Example title",
        prompt: "Example prompt",
        variant: "primary",
        ok: "Custom OK",
        cancel: "Continue anyway",
      });
    }, [confirm]);

    return <>{confirmModal}</>;
  },
};

export const PrimaryLight: StoryObj = { ...Primary, parameters: { colorScheme: "light" } };

export const Danger: StoryObj = {
  render: function Story() {
    const [confirm, confirmModal] = useConfirm();

    useLayoutEffect(() => {
      void confirm({
        title: "Example title",
        prompt: "Example prompt",
        variant: "danger",
        ok: "Destroy",
      });
    }, [confirm]);

    return <>{confirmModal}</>;
  },
};

export const DangerLight: StoryObj = { ...Danger, parameters: { colorScheme: "light" } };
