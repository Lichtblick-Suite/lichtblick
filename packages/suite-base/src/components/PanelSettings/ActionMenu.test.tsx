/** @jest-environment jsdom */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { userEvent } from "@storybook/testing-library";
import { render, screen } from "@testing-library/react";
import React from "react";

import { ActionMenu, ActionMenuProps } from "./ActionMenu";


jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

describe("ActionMenu", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderComponent = (propsOverride: Partial<ActionMenuProps> = {}) => {
        const props: ActionMenuProps = {
            allowShare: true,
            onReset: jest.fn(),
            onShare: jest.fn(),
            ...propsOverride,
        };

        const ui: React.ReactElement = (
            <ActionMenu {...props} />
        );

        return {
            ...render(ui),
            props,
            user: userEvent.setup(),
        };
    };

    it("should render the button and open the menu when clicked", async () => {
        const { user } = renderComponent();

        await user.click(screen.getByTestId("basic-button"));

        expect(screen.getByRole("menu")).toBeTruthy();
    });

    it("should call onShare when clicking the share item", async () => {
        const { user, props } = renderComponent();

        await user.click(screen.getByTestId("basic-button"));
        await user.click(screen.getByText("importOrExportSettingsWithEllipsis"));

        expect(props.onShare).toHaveBeenCalled();
    });

    it("should call onReset when clicking the reset item", async () => {
        const { user, props } = renderComponent();

        await user.click(screen.getByTestId("basic-button"));
        await user.click(screen.getByText("resetToDefaults"));

        expect(props.onReset).toHaveBeenCalled();
    });


    it("should disable the share item if allowShare is false", async () => {
        const { user, props } = renderComponent({ allowShare: false });

        await user.click(screen.getByTestId("basic-button"));
        const shareItem = screen.getByText("importOrExportSettingsWithEllipsis");
        await user.click(shareItem).catch(() => { }); // ignore error if click is not possible

        expect(props.onShare).not.toHaveBeenCalled();
    });
});
