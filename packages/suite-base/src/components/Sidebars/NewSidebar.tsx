// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import CloseIcon from "@mui/icons-material/Close";
import { Badge, BadgeProps, Divider, IconButton, Tab, Tabs } from "@mui/material";

import { useStyles } from "@lichtblick/suite-base/components/Sidebars/NewSidebar.style";
import Stack from "@lichtblick/suite-base/components/Stack";

export type NewSidebarItem = {
  title: string;
  component: React.ComponentType;
  badge?: {
    color: BadgeProps["color"];
    count: number;
  };
};

function Noop(): ReactNull {
  return ReactNull;
}

export function NewSidebar<K extends string>({
  items,
  anchor,
  onClose,
  activeTab,
  setActiveTab,
}: {
  items: Map<K, NewSidebarItem>;
  anchor: "right" | "left";
  onClose: () => void;
  activeTab: K | undefined;
  setActiveTab: (newValue: K) => void;
}): JSX.Element {
  const { classes, cx } = useStyles();

  const SelectedComponent = (activeTab != undefined && items.get(activeTab)?.component) ?? Noop;

  return (
    <Stack
      className={cx(classes.root, {
        [classes.anchorLeft]: anchor === "left",
        [classes.anchorRight]: anchor === "right",
      })}
      flexShrink={0}
      overflow="hidden"
      data-tourid={`sidebar-${anchor}`}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Tabs
          className={classes.tabs}
          textColor="inherit"
          value={activeTab ?? false}
          onChange={(_ev, newValue: K) => {
            if (newValue !== activeTab) {
              setActiveTab(newValue);
            }
          }}
        >
          {Array.from(items.entries(), ([key, item]) => (
            <Tab
              key={key}
              label={
                <Badge
                  invisible={item.badge == undefined}
                  badgeContent={item.badge?.count}
                  color={item.badge?.color}
                  classes={{
                    root: classes.badgeRoot,
                    badge: classes.badge,
                    invisible: classes.badgeInvisible,
                  }}
                >
                  {item.title}
                </Badge>
              }
              value={key}
              data-testid={`${key}-${anchor}`}
            />
          ))}
        </Tabs>

        <IconButton
          className={classes.iconButton}
          onClick={onClose}
          size="small"
          data-testid={`sidebar-close-${anchor}`}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      </Stack>
      <Divider />
      {activeTab != undefined && (
        <div className={classes.tabContent}>
          {SelectedComponent !== false ? <SelectedComponent /> : <></>}
        </div>
      )}
    </Stack>
  );
}
