// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import MockMessagePipelineProvider from "@lichtblick/suite-base/components/MessagePipeline/MockMessagePipelineProvider";
import DataSourceInfoPanel from "@lichtblick/suite-base/panels/DataSourceInfo";
import { PlayerPresence, Topic } from "@lichtblick/suite-base/players/types";
import PanelSetup from "@lichtblick/suite-base/stories/PanelSetup";
import { StoryObj } from "@storybook/react";

import { fromDate } from "@foxglove/rostime";

export default {
  title: "panels/DataSourceInfo",
  component: DataSourceInfoPanel,
};

const START_TIME = fromDate(new Date(2022, 1, 22, 1, 11, 11));
const END_TIME = fromDate(new Date(2022, 1, 22, 22, 22, 22));
const TOPICS: Topic[] = [
  { schemaName: "nav_msgs/OccupancyGrid", name: "/map" },
  { schemaName: "visualization_msgs/MarkerArray", name: "/semantic_map" },
  { schemaName: "tf2_msgs/TFMessage", name: "/tf" },
  { schemaName: "nav_msgs/OccupancyGrid", name: "/drivable_area" },
  { schemaName: "sensor_msgs/PointCloud2", name: "/RADAR_FRONT" },
  { schemaName: "sensor_msgs/CompressedImage", name: "/CAM_BACK_RIGHT/image_rect_compressed" },
  { schemaName: "sensor_msgs/CameraInfo", name: "/CAM_BACK_RIGHT/camera_info" },
  { schemaName: "visualization_msgs/ImageMarker", name: "/CAM_BACK/image_markers_lidar" },
  { schemaName: "foxglove_msgs/ImageMarkerArray", name: "/CAM_BACK/image_markers_annotations" },
  { schemaName: "geometry_msgs/PoseStamped", name: "/pose" },
  { schemaName: "sensor_msgs/NavSatFix", name: "/gps" },
  { schemaName: "visualization_msgs/MarkerArray", name: "/markers/annotations" },
  { schemaName: "sensor_msgs/Imu", name: "/imu" },
  { schemaName: "diagnostic_msgs/DiagnosticArray", name: "/diagnostics" },
  { schemaName: "nav_msgs/Odometry", name: "/odom", aliasedFromName: "/old_odom_name" },
];

export const Default: StoryObj = {
  render: () => {
    return (
      <MockMessagePipelineProvider
        startTime={START_TIME}
        endTime={END_TIME}
        topics={TOPICS}
        presence={PlayerPresence.PRESENT}
      >
        <PanelSetup fixture={{ topics: TOPICS }}>
          <DataSourceInfoPanel />
        </PanelSetup>
      </MockMessagePipelineProvider>
    );
  },
};

export const Empty: StoryObj = {
  render: () => {
    return (
      <MockMessagePipelineProvider noActiveData presence={PlayerPresence.NOT_PRESENT}>
        <PanelSetup>
          <DataSourceInfoPanel />
        </PanelSetup>
      </MockMessagePipelineProvider>
    );
  },
};
