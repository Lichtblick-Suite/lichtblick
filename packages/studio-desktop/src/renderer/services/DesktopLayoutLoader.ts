// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Logger from "@foxglove/log";
import { LayoutLoader, LayoutInfo, LayoutData } from "@foxglove/studio-base";

import { Desktop } from "../../common/types";

const log = Logger.getLogger(__filename);

export class DesktopLayoutLoader implements LayoutLoader {
  #bridge?: Desktop;
  public readonly namespace = "local";

  public constructor(bridge: Desktop) {
    this.#bridge = bridge;
  }

  public fetchLayouts = async (): Promise<LayoutInfo[]> => {
    const desktopLayouts = (await this.#bridge?.fetchLayouts()) ?? [];
    log.debug(`Loaded ${desktopLayouts.length} layout(s)`);

    const formattedLayouts = desktopLayouts.map((desktopLayout) => ({
      from: desktopLayout.from,
      name: desktopLayout.from.replace(".json", ""),
      data: desktopLayout.layoutJson as LayoutData,
    }));

    return formattedLayouts;
  };
}
