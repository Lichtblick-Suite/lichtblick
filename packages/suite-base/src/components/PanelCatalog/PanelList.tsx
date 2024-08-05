// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  useCurrentLayoutActions,
  usePanelMosaicId,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { PanelInfo } from "@lichtblick/suite-base/context/PanelCatalogContext";
import { List } from "@mui/material";
import { useCallback, useMemo } from "react";

import { PanelListItem, DropDescription } from "./PanelListItem";
import { PanelSelection } from "./types";

type Props = {
  filteredPanels: PanelInfo[];
  onPanelSelect: (arg0: PanelSelection) => void;
  onDragStart?: () => void;
  selectedPanelType?: string;
  highlightedPanelIdx?: number;
  searchQuery?: string;
};

function blurActiveElement() {
  // Clear focus from the panel menu button so that spacebar doesn't trigger
  // more panel additions.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

export function PanelList(props: Props): JSX.Element {
  const {
    filteredPanels,
    highlightedPanelIdx,
    onDragStart,
    onPanelSelect,
    selectedPanelType,
    searchQuery = "",
  } = props;

  const { dropPanel } = useCurrentLayoutActions();
  const mosaicId = usePanelMosaicId();

  // Update panel layout when a panel menu item is dropped;
  // actual operations to change layout supplied by react-mosaic-component
  const onPanelMenuItemDrop = useCallback(
    ({ config, type, position, path, tabId }: DropDescription) => {
      dropPanel({
        newPanelType: type,
        destinationPath: path,
        position,
        tabId,
        config,
      });
      blurActiveElement();
    },
    [dropPanel],
  );

  const highlightedPanel = useMemo(() => {
    return highlightedPanelIdx != undefined ? filteredPanels[highlightedPanelIdx] : undefined;
  }, [filteredPanels, highlightedPanelIdx]);

  const displayPanelListItem = useCallback(
    (panelInfo: PanelInfo) => {
      const { title, type, config } = panelInfo;
      return (
        <PanelListItem
          key={`${type}-${title}`}
          mosaicId={mosaicId}
          panel={panelInfo}
          onDragStart={onDragStart}
          onDrop={onPanelMenuItemDrop}
          onClick={() => {
            onPanelSelect({ type, config });
            blurActiveElement();
          }}
          checked={type === selectedPanelType}
          highlighted={highlightedPanel?.title === title}
          searchQuery={searchQuery}
        />
      );
    },
    [
      highlightedPanel?.title,
      mosaicId,
      onDragStart,
      onPanelMenuItemDrop,
      onPanelSelect,
      searchQuery,
      selectedPanelType,
    ],
  );

  return (
    <List dense disablePadding>
      {filteredPanels.map(displayPanelListItem)}
    </List>
  );
}
