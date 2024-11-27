/** @jest-environment jsdom */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { userEvent } from "@storybook/testing-library";
import { render, screen } from "@testing-library/react";

import { NewSidebar, NewSidebarProps } from "@lichtblick/suite-base/components/Sidebars/NewSidebar";
import { SidebarItem } from "@lichtblick/suite-base/components/Sidebars/types";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

describe("NewSidebar", () => {
  function sidebarItem(props: Partial<SidebarItem> = {}): SidebarItem {
    const title = BasicBuilder.string();
    return {
      title,
      component: () => <div>Component of {title}</div>,
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
        sidebarItem({
          title: `Title ${i}`,
          component: () => <div>Component {i}</div>,
          ...sidebarItemProps,
        }),
      );
    }
    return items;
  }

  function buildSidebarItems(): {
    tabs: string[];
    items: Map<string, SidebarItem>;
    sidebarItems: SidebarItem[];
  } {
    const tabs = BasicBuilder.strings();
    const items = new Map<string, SidebarItem>();
    tabs.forEach((tab) => {
      items.set(tab, sidebarItem());
    });
    const sidebarItems = tabs.map((tab) => items.get(tab)!);

    return {
      tabs,
      items,
      sidebarItems,
    };
  }

  const renderComponent = (propsOverride: Partial<NewSidebarProps<string>> = {}) => {
    const { tabs, items, sidebarItems } = buildSidebarItems();
    const props: NewSidebarProps<string> = {
      activeTab: tabs[0],
      anchor: "left",
      items,
      onClose: jest.fn(),
      setActiveTab: jest.fn(),
      ...propsOverride,
    };

    const ui: React.ReactElement = <NewSidebar {...props} />;

    return {
      ...render(ui),
      props,
      sidebarItems,
      tabs,
      user: userEvent.setup(),
    };
  };

  it("should render the title and component of the sidebarItem", () => {
    const activeTab = BasicBuilder.string();
    const items = new Map<string, SidebarItem>();
    items.set(activeTab, sidebarItem());

    renderComponent({ items, activeTab });

    const item = items.get(activeTab)!;
    expect(screen.getByText(item.title)).toBeDefined();
    expect(screen.getByText(`Component of ${item.title}`)).toBeDefined();
  });

  it("should render the all titles, but only the selected component", () => {
    const { rerender, tabs, sidebarItems, props } = renderComponent();

    // All titles are in the screen
    expect(screen.getByText(sidebarItems[0]!.title)).toBeDefined();
    expect(screen.getByText(sidebarItems[1]!.title)).toBeDefined();
    expect(screen.getByText(sidebarItems[2]!.title)).toBeDefined();

    // Only the first component is rendered
    expect(screen.getByText(`Component of ${sidebarItems[0]!.title}`)).toBeDefined();
    expect(() => screen.getByText(`Component of ${sidebarItems[1]!.title}`)).toThrow();
    expect(() => screen.getByText(`Component of ${sidebarItems[2]!.title}`)).toThrow();

    // Switch to the second tab
    rerender(
      <NewSidebar
        items={props.items}
        anchor="left"
        onClose={jest.fn()}
        activeTab={tabs[1]}
        setActiveTab={jest.fn()}
      />,
    );

    // All titles are in the screen again
    expect(screen.getByText(sidebarItems[0]!.title)).toBeDefined();
    expect(screen.getByText(sidebarItems[1]!.title)).toBeDefined();
    expect(screen.getByText(sidebarItems[2]!.title)).toBeDefined();

    // Only the second component is rendered
    expect(() => screen.getByText(`Component of ${sidebarItems[0]!.title}`)).toThrow();
    expect(screen.getByText(`Component of ${sidebarItems[1]!.title}`)).toBeDefined();
    expect(() => screen.getByText(`Component of ${sidebarItems[2]!.title}`)).toThrow();

    // Switch to the third tab
    rerender(
      <NewSidebar
        items={props.items}
        anchor="left"
        onClose={jest.fn()}
        activeTab={tabs[2]}
        setActiveTab={jest.fn()}
      />,
    );

    // All titles are in the screen again
    expect(screen.getByText(sidebarItems[0]!.title)).toBeDefined();
    expect(screen.getByText(sidebarItems[1]!.title)).toBeDefined();
    expect(screen.getByText(sidebarItems[2]!.title)).toBeDefined();

    // Only the third component is rendered
    expect(() => screen.getByText(`Component of ${sidebarItems[0]!.title}`)).toThrow();
    expect(() => screen.getByText(`Component of ${sidebarItems[1]!.title}`)).toThrow();
    expect(screen.getByText(`Component of ${sidebarItems[2]!.title}`)).toBeDefined();
  });

  it("should not render any component when activetab is undefined", () => {
    const { sidebarItems } = renderComponent({ activeTab: undefined });

    // All titles are in the screen
    expect(screen.getByText(sidebarItems[0]!.title)).toBeDefined();
    expect(screen.getByText(sidebarItems[1]!.title)).toBeDefined();
    expect(screen.getByText(sidebarItems[2]!.title)).toBeDefined();

    // Will not find any component content
    expect(() => screen.getByText(`Component of ${sidebarItems[0]!.title}`)).toThrow();
    expect(() => screen.getByText(`Component of ${sidebarItems[1]!.title}`)).toThrow();
    expect(() => screen.getByText(`Component of ${sidebarItems[2]!.title}`)).toThrow();
  });

  it("should render the badge content", () => {
    const { items } = buildSidebarItems();
    const key = "withBadge";
    items.set(
      key,
      sidebarItem({
        badge: {
          count: BasicBuilder.number(),
        },
      }),
    );
    const expectedItem = items.get(key)!;

    renderComponent({ items, activeTab: undefined });

    expect(screen.getByText(expectedItem.title)).toBeDefined();
    expect(screen.getByText(expectedItem.badge!.count)).toBeDefined();
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

    const anchor = BasicBuilder.sample(["left", "right"]);

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
