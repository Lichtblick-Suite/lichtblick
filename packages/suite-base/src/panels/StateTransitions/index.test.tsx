/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react-dom/test-utils";

import { add as addTimes, fromSec } from "@lichtblick/rostime";
import { useMessagePipelineGetter } from "@lichtblick/suite-base/components/MessagePipeline";
import StateTransitions from "@lichtblick/suite-base/panels/StateTransitions";
import { StateTransitionPanelProps } from "@lichtblick/suite-base/panels/StateTransitions/types";

describe("StateTransitions", () => {
  const mockUseMessagePipelineGetter = useMessagePipelineGetter as jest.Mock;
  const mockSeekPlayback = jest.fn();
  const mockMessagePipeline = {
    seekPlayback: mockSeekPlayback,
    playerState: {
      activeData: {
        startTime: { sec: 0, nsec: 0 },
      },
    },
  };

  beforeEach(() => {
    mockUseMessagePipelineGetter.mockReturnValue(mockMessagePipeline);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps: StateTransitionPanelProps = {
    config: {
      paths: [{ value: "/test/path", timestampMethod: "receiveTime" }],
      isSynced: true,
      showPoints: true,
    },
    saveConfig: jest.fn(),
  };

  it("renders the StateTransitions component", () => {
    render(<StateTransitions {...defaultProps} />);
    expect(screen.getByText("PanelToolbar")).toBeInTheDocument();
    expect(screen.getByText("TimeBasedChart")).toBeInTheDocument();
    expect(screen.getByText("PathLegend")).toBeInTheDocument();
  });

  it("calls seekPlayback on chart click", () => {
    render(<StateTransitions {...defaultProps} />);
    const chart = screen.getByText("TimeBasedChart");

    act(() => {
      void userEvent.click(chart);
    });

    const seekSeconds = 10;
    const seekTime = addTimes({ sec: 0, nsec: 0 }, fromSec(seekSeconds));
    expect(mockSeekPlayback).toHaveBeenCalledWith(seekTime);
  });

  it("does not call seekPlayback if seekSeconds is undefined", () => {
    render(<StateTransitions {...defaultProps} />);
    const chart = screen.getByText("TimeBasedChart");

    act(() => {
      userEvent.click(chart);
    });

    expect(mockSeekPlayback).not.toHaveBeenCalled();
  });

  it("does not call seekPlayback if startTime is undefined", () => {
    mockMessagePipeline.playerState.activeData.startTime = undefined;
    render(<StateTransitions {...defaultProps} />);
    const chart = screen.getByText("TimeBasedChart");

    act(() => {
      userEvent.click(chart);
    });

    expect(mockSeekPlayback).not.toHaveBeenCalled();
  });

  it("does not call seekPlayback if seekPlayback is undefined", () => {
    mockMessagePipeline.seekPlayback = undefined;
    render(<StateTransitions {...defaultProps} />);
    const chart = screen.getByText("TimeBasedChart");

    act(() => {
      userEvent.click(chart);
    });

    expect(mockSeekPlayback).not.toHaveBeenCalled();
  });
});
