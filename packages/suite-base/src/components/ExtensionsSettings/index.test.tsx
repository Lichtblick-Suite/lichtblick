/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTranslation } from "react-i18next";
import "@testing-library/jest-dom";

import useExtensionSettings from "@lichtblick/suite-base/components/ExtensionsSettings/hooks/useExtensionSettings";

import ExtensionsSettings from "./index";

jest.mock("@lichtblick/suite-base/components/ExtensionsSettings/hooks/useExtensionSettings");
jest.mock("react-i18next");

describe("ExtensionsSettings", () => {
  const mockSetUndebouncedFilterText = jest.fn();
  const mockRefreshMarketplaceEntries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useExtensionSettings as jest.Mock).mockReturnValue({
      setUndebouncedFilterText: mockSetUndebouncedFilterText,
      marketplaceEntries: { error: undefined },
      refreshMarketplaceEntries: mockRefreshMarketplaceEntries,
      undebouncedFilterText: "",
      namespacedData: [{ namespace: "org", entries: [] }],
      groupedMarketplaceData: [],
      debouncedFilterText: "",
    });

    (useTranslation as jest.Mock).mockReturnValue({
      t: (key: string) => key,
    });
  });

  it("renders the search bar and extension lists", () => {
    render(<ExtensionsSettings />);

    expect(screen.getByTestId("SearchBarComponent")).toBeInTheDocument();

    expect(screen.getByText("Organization")).toBeInTheDocument();
  });

  it("handles search bar input", async () => {
    render(<ExtensionsSettings />);

    const searchInput = screen.getByPlaceholderText("searchExtensions");
    await userEvent.type(searchInput, "test");

    expect(mockSetUndebouncedFilterText).toHaveBeenCalledWith("t");
    expect(mockSetUndebouncedFilterText).toHaveBeenCalledWith("e");
    expect(mockSetUndebouncedFilterText).toHaveBeenCalledWith("s");
    expect(mockSetUndebouncedFilterText).toHaveBeenCalledWith("t");
  });

  it("displays an error alert when marketplaceEntries.error is set", () => {
    (useExtensionSettings as jest.Mock).mockReturnValue({
      setUndebouncedFilterText: mockSetUndebouncedFilterText,
      marketplaceEntries: { error: true },
      refreshMarketplaceEntries: mockRefreshMarketplaceEntries,
      undebouncedFilterText: "",
      namespacedData: [],
      groupedMarketplaceData: [],
      debouncedFilterText: "",
    });

    render(<ExtensionsSettings />);

    expect(screen.getByText("failedToRetrieveMarketplaceExtensions")).toBeInTheDocument();

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    expect(mockRefreshMarketplaceEntries).toHaveBeenCalledTimes(1);
  });
});
