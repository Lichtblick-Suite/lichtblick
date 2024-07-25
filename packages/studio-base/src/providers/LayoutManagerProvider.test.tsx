/** @jest-environment jsdom */
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { render, waitFor } from "@testing-library/react";
import { useNetworkState } from "react-use";

import { useVisibilityState } from "@foxglove/hooks";
import { LayoutData } from "@foxglove/studio-base/context/CurrentLayoutContext";
import { useLayoutStorage } from "@foxglove/studio-base/context/LayoutStorageContext";
import { useRemoteLayoutStorage } from "@foxglove/studio-base/context/RemoteLayoutStorageContext";
import LayoutManagerProvider from "@foxglove/studio-base/providers/LayoutManagerProvider";
import { LayoutLoader } from "@foxglove/studio-base/services/ILayoutLoader";
import MockLayoutManager from "@foxglove/studio-base/services/LayoutManager/MockLayoutManager";

// Mock dependencies
jest.mock("react-use");
jest.mock("@foxglove/hooks");
jest.mock("@foxglove/studio-base/context/LayoutStorageContext");
jest.mock("@foxglove/studio-base/context/RemoteLayoutStorageContext");

const mockLayoutManager = new MockLayoutManager();

jest.mock("@foxglove/studio-base/services/LayoutManager/LayoutManager", () =>
  jest.fn(() => mockLayoutManager),
);

describe("LayoutManagerProvider", () => {
  const mockLayoutLoader: jest.Mocked<LayoutLoader> = {
    fetchLayouts: jest.fn(),
    namespace: "local",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useNetworkState as jest.Mock).mockReturnValue({ online: true });
    (useVisibilityState as jest.Mock).mockReturnValue("visible");
    (useLayoutStorage as jest.Mock).mockReturnValue({});
    (useRemoteLayoutStorage as jest.Mock).mockReturnValue({});
  });

  it("should call layoutManager.setOnline accordingly with useNetworkState", async () => {
    (useNetworkState as jest.Mock).mockResolvedValueOnce({ online: false });

    // 1 render with true and another with false.
    render(<LayoutManagerProvider />);
    render(<LayoutManagerProvider />);

    await waitFor(() => {
      expect(mockLayoutManager.setOnline).toHaveBeenCalledTimes(2);
      expect(mockLayoutManager.setOnline).toHaveBeenCalledWith(true);
      expect(mockLayoutManager.setOnline).toHaveBeenCalledWith(false);
    });
  });

  it("should not call getLayouts or saveNewLayout if layout loaders is undefined or an empty array", async () => {
    // 1 render with no loaders and another with empty array.
    render(<LayoutManagerProvider />);
    render(<LayoutManagerProvider loaders={[]} />);

    await waitFor(() => {
      expect(mockLayoutManager.getLayouts).toHaveBeenCalledTimes(0);
      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledTimes(0);
    });
  });

  it("should not call layoutManager.saveNewLayout if there is no layouts", async () => {
    mockLayoutLoader.fetchLayouts.mockResolvedValueOnce([]);

    render(<LayoutManagerProvider loaders={[mockLayoutLoader]} />);

    await waitFor(() => {
      expect(mockLayoutManager.getLayouts).toHaveBeenCalledTimes(1);
      expect(mockLayoutLoader.fetchLayouts).toHaveBeenCalledTimes(1);
      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledTimes(0);
    });
  });

  it("should fetch layouts from loaders and save the new layouts", async () => {
    mockLayoutLoader.fetchLayouts.mockResolvedValueOnce([
      { from: "layout1.json", name: "layout1", data: {} as LayoutData },
      { from: "layout2.json", name: "layout2", data: {} as LayoutData },
    ]);

    render(<LayoutManagerProvider loaders={[mockLayoutLoader]} />);

    await waitFor(() => {
      // Should be called 2 times, because only one loader.
      expect(mockLayoutLoader.fetchLayouts).toHaveBeenCalledTimes(1);

      // Should be called 1 time, once for all loaders.
      expect(mockLayoutManager.getLayouts).toHaveBeenCalledTimes(1);

      // Expect all layouts to be saved.
      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledTimes(2);
      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledWith(
        expect.objectContaining({ from: "layout1.json", name: "layout1" }),
      );
      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledWith(
        expect.objectContaining({ from: "layout2.json", name: "layout2" }),
      );
    });
  });

  it("should fetch layouts from multiple loaders and save the new layouts", async () => {
    // Mock two loaders with different layouts.
    mockLayoutLoader.fetchLayouts
      .mockResolvedValueOnce([
        { from: "layout1.json", name: "layout1", data: {} as LayoutData },
        { from: "layout2.json", name: "layout2", data: {} as LayoutData },
      ])
      .mockResolvedValueOnce([
        { from: "layout3.json", name: "layout3", data: {} as LayoutData },
        { from: "layout4.json", name: "layout4", data: {} as LayoutData },
      ]);

    render(<LayoutManagerProvider loaders={[mockLayoutLoader, mockLayoutLoader]} />);

    await waitFor(() => {
      // Should be called 2 times, one per loader.
      expect(mockLayoutLoader.fetchLayouts).toHaveBeenCalledTimes(2);

      // Should be called 1 time, once for all loaders.
      expect(mockLayoutManager.getLayouts).toHaveBeenCalledTimes(1);

      // Expect all layouts to be saved.
      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledTimes(4);

      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledWith(
        expect.objectContaining({ from: "layout1.json", name: "layout1" }),
      );
      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledWith(
        expect.objectContaining({ from: "layout2.json", name: "layout2" }),
      );
      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledWith(
        expect.objectContaining({ from: "layout3.json", name: "layout3" }),
      );
      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledWith(
        expect.objectContaining({ from: "layout4.json", name: "layout4" }),
      );
    });
  });

  it("should fetch layouts from loaders and not save duplicated layouts", async () => {
    // Make layouts with same name, but different "from"
    mockLayoutLoader.fetchLayouts.mockResolvedValueOnce([
      { from: "layout1.json", name: "layout", data: {} as LayoutData },
      { from: "layout2.json", name: "layout", data: {} as LayoutData },
      { from: "layout3.json", name: "layout", data: {} as LayoutData },
    ]);

    // Mock an existing layout with "from" equals to "layout2"
    mockLayoutManager.getLayouts.mockResolvedValueOnce([{ from: "layout2.json", name: "layout2" }]);

    render(<LayoutManagerProvider loaders={[mockLayoutLoader]} />);

    await waitFor(() => {
      expect(mockLayoutLoader.fetchLayouts).toHaveBeenCalledTimes(1);
      expect(mockLayoutManager.getLayouts).toHaveBeenCalledTimes(1);

      // Expect only "layout1.json" and "layout3.json" to be saved.
      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledTimes(2);

      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledWith(
        expect.objectContaining({ from: "layout1.json", name: "layout" }),
      );
      expect(mockLayoutManager.saveNewLayout).toHaveBeenCalledWith(
        expect.objectContaining({ from: "layout3.json", name: "layout" }),
      );

      // Expect "layout2.json" to not be saved, because it already was loaded.
      expect(mockLayoutManager.saveNewLayout).not.toHaveBeenCalledWith(
        expect.objectContaining({ from: "layout2.json", name: "layout" }),
      );
    });
  });

  it("should call layoutManager.syncWithRemote", async () => {
    render(<LayoutManagerProvider />);

    await waitFor(() => {
      expect(mockLayoutManager.syncWithRemote).toHaveBeenCalledTimes(1);
    });
  });

  it("should not call layoutManager.syncWithRemote if offline", async () => {
    (useNetworkState as jest.Mock).mockReturnValueOnce({ online: false });

    render(<LayoutManagerProvider />);

    await waitFor(() => {
      expect(mockLayoutManager.syncWithRemote).toHaveBeenCalledTimes(0);
    });
  });

  it("should not call layoutManager.syncWithRemote if not visible", async () => {
    (useVisibilityState as jest.Mock).mockReturnValueOnce("invisible");

    render(<LayoutManagerProvider />);

    await waitFor(() => {
      expect(mockLayoutManager.syncWithRemote).toHaveBeenCalledTimes(0);
    });
  });

  it("should not call layoutManager.syncWithRemote if there is not remote storage", async () => {
    (useRemoteLayoutStorage as jest.Mock).mockReturnValueOnce(undefined);

    render(<LayoutManagerProvider />);

    await waitFor(() => {
      expect(mockLayoutManager.syncWithRemote).toHaveBeenCalledTimes(0);
    });
  });
});
