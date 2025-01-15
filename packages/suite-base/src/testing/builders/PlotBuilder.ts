// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { Datum, HoverElement } from "@lichtblick/suite-base/panels/Plot/types";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import { defaults } from "@lichtblick/suite-base/testing/builders/utilities";

export default class PlotBuilder {
  public static datum(props: Partial<Datum> = {}): Datum {
    return defaults<Datum>(props, {
      x: BasicBuilder.number(),
      y: BasicBuilder.number(),
      value: undefined,
    });
  }

  public static hoverElement(props: Partial<HoverElement> = {}): HoverElement {
    return defaults<HoverElement>(props, {
      configIndex: BasicBuilder.number(),
      data: PlotBuilder.datum(),
    });
  }

  public static hoverElements(count = 3): HoverElement[] {
    return BasicBuilder.multiple(PlotBuilder.hoverElement, count);
  }
}
