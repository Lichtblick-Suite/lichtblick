/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { render } from "@testing-library/react";

import { NewSidebar } from "@lichtblick/suite-base/components/Sidebars/NewSidebar";
import { SidebarItem } from "@lichtblick/suite-base/components/Sidebars/types";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

describe("NewSidebar", () => {
  function makeSideBarItem(props: Partial<SidebarItem> = {}): SidebarItem {
    return {
      title: BasicBuilder.string(),
      ...props,
    };
  }

  function makeNSidebarItems(
    n: number,
    sidebarItemProps: Partial<SidebarItem> = {},
  ): Map<string, SidebarItem> {
    const items = new Map<string, SidebarItem>();
    for (let i = 1; i < n + 1; i++) {
      items.set(
        `item${i}`,
        makeSideBarItem({
          title: `Title ${i}`,
          component: () => <div>Component {i}</div>,
          ...sidebarItemProps,
        }),
      );
    }
    return items;
  }

  it("should render the title and component of the sidebarItem", () => {
    const items = makeNSidebarItems(1);

    const { getByText } = render(
      <NewSidebar
        items={items}
        anchor="left"
        onClose={jest.fn()}
        activeTab="item1"
        setActiveTab={jest.fn()}
      />,
    );
    expect(getByText("Title 1")).toBeDefined();
    expect(getByText("Component 1")).toBeDefined();
  });

  it("should render the all titles, but only the selected component", () => {
    const items = makeNSidebarItems(3);

    const { getByText, rerender } = render(
      <NewSidebar
        items={items}
        anchor="left"
        onClose={jest.fn()}
        activeTab="item1"
        setActiveTab={jest.fn()}
      />,
    );

    // All titles are in the screen
    expect(getByText("Title 1")).toBeDefined();
    expect(getByText("Title 2")).toBeDefined();
    expect(getByText("Title 3")).toBeDefined();

    // Only the first component is rendered
    expect(getByText("Component 1")).toBeDefined();
    expect(() => getByText("Component 2")).toThrow();
    expect(() => getByText("Component 3")).toThrow();

    // Switch to the second tab
    rerender(
      <NewSidebar
        items={items}
        anchor="left"
        onClose={jest.fn()}
        activeTab="item2"
        setActiveTab={jest.fn()}
      />,
    );

    // All titles are in the screen again
    expect(getByText("Title 1")).toBeDefined();
    expect(getByText("Title 2")).toBeDefined();
    expect(getByText("Title 3")).toBeDefined();

    // Only the second component is rendered
    expect(() => getByText("Component 1")).toThrow();
    expect(getByText("Component 2")).toBeDefined();
    expect(() => getByText("Component 3")).toThrow();

    // Switch to the third tab
    rerender(
      <NewSidebar
        items={items}
        anchor="left"
        onClose={jest.fn()}
        activeTab="item3"
        setActiveTab={jest.fn()}
      />,
    );

    // All titles are in the screen again
    expect(getByText("Title 1")).toBeDefined();
    expect(getByText("Title 2")).toBeDefined();
    expect(getByText("Title 3")).toBeDefined();

    // Only the third component is rendered
    expect(() => getByText("Component 1")).toThrow();
    expect(() => getByText("Component 2")).toThrow();
    expect(getByText("Component 3")).toBeDefined();
  });

  it("should not render any component when activetab is undefined", () => {
    const items = makeNSidebarItems(3);

    const { getByText } = render(
      <NewSidebar
        items={items}
        anchor="left"
        onClose={jest.fn()}
        activeTab={undefined}
        setActiveTab={jest.fn()}
      />,
    );

    // All titles are in the screen
    expect(getByText("Title 1")).toBeDefined();
    expect(getByText("Title 2")).toBeDefined();
    expect(getByText("Title 3")).toBeDefined();

    // Will not find any component content
    expect(() => getByText("Component 1")).toThrow();
    expect(() => getByText("Component 2")).toThrow();
    expect(() => getByText("Component 3")).toThrow();
  });

  it("should render the badge content", () => {
    const items = makeNSidebarItems(1, {
      badge: {
        count: 5,
        color: "primary",
      },
    });

    const { getByText } = render(
      <NewSidebar
        items={items}
        anchor="left"
        onClose={jest.fn()}
        activeTab="item1"
        setActiveTab={jest.fn()}
      />,
    );

    expect(getByText("Title 1")).toBeDefined();
    expect(getByText("5")).toBeDefined();
  });

  it("should call setActiveTab when a tab is clicked", () => {
    const items = makeNSidebarItems(2);

    const setActiveTab = jest.fn();
    const { getByTestId } = render(
      <NewSidebar
        items={items}
        anchor="left"
        onClose={jest.fn()}
        activeTab="item1"
        setActiveTab={setActiveTab}
      />,
    );

    getByTestId("item2-left").click();
    expect(setActiveTab).toHaveBeenCalledWith("item2");
  });

  it("should not call setActiveTab when the same tab is clicked", () => {
    const items = makeNSidebarItems(2);

    const setActiveTab = jest.fn();
    const { getByTestId } = render(
      <NewSidebar
        items={items}
        anchor="left"
        onClose={jest.fn()}
        activeTab="item1"
        setActiveTab={setActiveTab}
      />,
    );

    getByTestId("item1-left").click();
    expect(setActiveTab).not.toHaveBeenCalled();
  });

  it("should call onClose when the close button is clicked", () => {
    const items = makeNSidebarItems(1);

    const anchor = BasicBuilder.sample(["left", "right"]) as "left" | "right";

    const onClose = jest.fn();
    const { getByTestId } = render(
      <NewSidebar
        items={items}
        anchor={anchor}
        onClose={onClose}
        activeTab="item1"
        setActiveTab={jest.fn()}
      />,
    );

    getByTestId(`sidebar-close-${anchor}`).click();
    expect(onClose).toHaveBeenCalled();
  });

  it("should change tabs when setActiveTab is called", () => {
    const items = makeNSidebarItems(2);

    let activeTab = "item1";

    const setActiveTab = jest.fn((tab: string) => {
      activeTab = tab;
    });

    const { getByText, getByTestId, rerender } = render(
      <NewSidebar
        items={items}
        anchor="left"
        onClose={jest.fn()}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />,
    );

    // Only the first component is rendered
    expect(getByText("Component 1")).toBeDefined();
    expect(() => getByText("Component 2")).toThrow();

    // Click in the second tab
    getByTestId("item2-left").click();

    // Expect the setActiveTab to have been called and changed the activeTab
    expect(setActiveTab).toHaveBeenCalledWith("item2");
    expect(activeTab).toBe("item2");

    rerender(
      <NewSidebar
        items={items}
        anchor="left"
        onClose={jest.fn()}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />,
    );

    // Only the second component is rendered
    expect(() => getByText("Component 1")).toThrow();
    expect(getByText("Component 2")).toBeDefined();
  });
});
