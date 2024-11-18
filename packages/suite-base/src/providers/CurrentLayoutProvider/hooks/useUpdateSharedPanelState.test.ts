/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { renderHook, act } from "@testing-library/react";
import { MutableRefObject } from "react";

import { LayoutState, LayoutID } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import useUpdateSharedPanelState from "./useUpdateSharedPanelState";

describe("useUpdateSharedPanelState", () => {
  let mockLayoutStateRef: MutableRefObject<LayoutState>;
  let mockSetLayoutState: jest.Mock;

  beforeEach(() => {
    // Set up the initial layout state ref and the mock function for setLayoutState
    mockSetLayoutState = jest.fn();

    mockLayoutStateRef = {
      current: {
        sharedPanelState: {},
        selectedLayout: {
          id: BasicBuilder.string() as LayoutID,
          loading: BasicBuilder.boolean(),
          data: undefined,
          name: BasicBuilder.string(),
          edited: BasicBuilder.boolean(),
        },
      },
    };
  });

  it("does not update state if selectedLayout.data is undefined", () => {

    const { result } = renderHook(() =>
      useUpdateSharedPanelState(mockLayoutStateRef, mockSetLayoutState),
    );

    // Call updateSharedPanelState with sample data
    act(() => {
      result.current.updateSharedPanelState("testType", { someKey: "someValue" });
    });

    // Expect setLayoutState not to have been called because selectedLayout.data is undefined
    expect(mockSetLayoutState).not.toHaveBeenCalled();
  });
});
