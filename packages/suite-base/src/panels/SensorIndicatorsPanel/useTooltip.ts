// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useState, useCallback } from "react";
import { PanelExtensionContext } from "@lichtblick/suite";
import { SensorStatus } from "./SensorStatus";

interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

const useTooltip = (context: PanelExtensionContext) => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  const handleMouseEnter = useCallback(
    (sensors: SensorStatus[], event: React.MouseEvent<HTMLLabelElement, MouseEvent>) => {
      const boundingRect = context.panelElement.getBoundingClientRect();
      const content = sensors
        .map(
          (sensor) =>
            `Sensor: ${sensor.sensor_name}, FPS: ${sensor.fps}, Drops: ${sensor.dropsInWindow}`,
        )
        .join("\n");
      setTooltip({
        visible: true,
        content,
        x: event.clientX - boundingRect.left + 10,
        y: event.clientY - boundingRect.top + 10,
      });
    },
    [context],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLLabelElement, MouseEvent>) => {
      const boundingRect = context.panelElement.getBoundingClientRect();
      setTooltip((prevTooltip) => ({
        ...prevTooltip,
        x: event.clientX - boundingRect.left + 10,
        y: event.clientY - boundingRect.top + 10,
      }));
    },
    [context],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip({ visible: false, content: "", x: 0, y: 0 });
  }, []);

  return { tooltip, handleMouseEnter, handleMouseMove, handleMouseLeave };
};

export default useTooltip;
