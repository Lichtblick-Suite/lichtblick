// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PanelExtensionContext } from "@lichtblick/suite";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { SensorStatusMessage } from "./SensorStatusMessage";
import { SensorStatus } from "./SensorStatus";
import { getBackgroundColor, parseSensorMessages } from "./utils";
import useTooltip from "./useTooltip";

export function SensorIndicatorsPanel({
  context,
}: {
  context: PanelExtensionContext;
}): JSX.Element {
  const [sensors, setSensors] = useState<SensorStatus[]>([]);
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();
  const [isSummaryView, setIsSummaryView] = useState<boolean>(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { tooltip, handleMouseEnter, handleMouseMove, handleMouseLeave } = useTooltip(context);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setSensors([]);
    }, 5000);
  };

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);

      const sensorMessages = renderState.currentFrame?.filter(
        (msg) => msg.topic === "/diagnostics",
      ) as SensorStatusMessage[] | undefined;

      if (sensorMessages) {
        const newSensors = parseSensorMessages(sensorMessages);

        setSensors((prevSensors) => {
          const updatedSensors = [...prevSensors];
          newSensors.forEach((newSensor) => {
            const index = updatedSensors.findIndex(
              (sensor) => sensor.sensor_name === newSensor.sensor_name,
            );
            if (index !== -1) {
              updatedSensors[index] = newSensor;
            } else {
              updatedSensors.push(newSensor);
            }
          });
          return updatedSensors;
        });

        resetTimeout();
      }
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.subscribe([{ topic: "/diagnostics" }]);
  }, [context]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  const groupSensors = () => {
    const grouped: Record<string, SensorStatus[]> = {};
    sensors.forEach((sensor) => {
      const key = sensor.sensor_name.split("/").slice(0, 2).join("/");
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key]!.push(sensor); // Using non-null assertion operator here
    });
    return grouped;
  };

  const renderSensors = () => {
    if (isSummaryView) {
      const groupedSensors = groupSensors();
      return Object.entries(groupedSensors).map(([key, group]) => {
        const status = group.some((sensor) => sensor.status === "ERROR")
          ? "ERROR"
          : group.some((sensor) => sensor.status === "WARN")
            ? "WARN"
            : group.some((sensor) => sensor.status === "STALE")
              ? "STALE"
              : "OK";
        return (
          <label
            key={key}
            onMouseEnter={(event) => handleMouseEnter(group, event)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              flex: "1 1 30%",
              margin: "0.5rem",
              padding: "0.5rem",
              backgroundColor: getBackgroundColor(status),
              color: "white",
              borderRadius: "4px",
              textAlign: "center",
            }}
          >
            {key}
          </label>
        );
      });
    }
    return sensors.map((sensor, index) => (
      <label
        key={index}
        onMouseEnter={(event) => handleMouseEnter([sensor], event)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          flex: "1 1 30%",
          margin: "0.5rem",
          padding: "0.5rem",
          backgroundColor: getBackgroundColor(sensor.status),
          color: "white",
          borderRadius: "4px",
          textAlign: "center",
        }}
      >
        {sensor.sensor_name}
      </label>
    ));
  };

  return (
    <div>
      <button onClick={() => setIsSummaryView(!isSummaryView)}>
        {isSummaryView ? "Switch to Full View" : "Switch to Summary View"}
      </button>
      <div style={{ display: "flex", flexWrap: "wrap", padding: "1rem" }}>
        {renderSensors()}
        {tooltip.visible && (
          <div
            style={{
              position: "absolute",
              left: tooltip.x,
              top: tooltip.y,
              backgroundColor: "black",
              color: "white",
              padding: "0.5rem",
              borderRadius: "4px",
              pointerEvents: "none",
              zIndex: 1000,
              whiteSpace: "pre-line", // Ensures line breaks are rendered
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
}

export function initSensorIndicatorsPanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<SensorIndicatorsPanel context={context} />, context.panelElement);

  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}
