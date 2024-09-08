// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import React from "react";
import { RosbagInfo } from "../types";
import { formatBytes } from "../utils/helpers";
import {
  tableHeaderCellStyle,
  tableCellStyle,
  selectedRowStyle,
  fixedStatusColumnStyle,
} from "../styles/styles";

interface UploadTableProps {
  rosbags: RosbagInfo[];
  selectedFiles: Set<string>;
  onCheckboxChange: (rosbag: string) => void;
  onSort: (key: string) => void;
  sortOrder: { key: string; order: "asc" | "desc" };
}

export const UploadTable: React.FC<UploadTableProps> = ({
  rosbags,
  selectedFiles,
  onCheckboxChange,
  onSort,
  sortOrder,
}) => {
  // Sort the rosbags based on the current sort key (time or size) and order (asc or desc)
  const sortedFiles = [...rosbags].sort((a, b) => {
    if (sortOrder.key === "time") {
      return sortOrder.order === "asc" ? a.time - b.time : b.time - a.time;
    } else if (sortOrder.key === "size") {
      return sortOrder.order === "asc"
        ? Number(a.size) - Number(b.size)
        : Number(b.size) - Number(a.size);
    }
    return 0;
  });

  return (
    <div style={{ maxHeight: "60vh", overflowY: "auto", border: "1px solid black" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={tableHeaderCellStyle}>Select</th>
            <th style={tableHeaderCellStyle}>File Name</th>
            <th style={tableHeaderCellStyle} onClick={() => onSort("time")}>
              Date Time
            </th>
            <th style={tableHeaderCellStyle} onClick={() => onSort("size")}>
              Size
            </th>
            <th style={tableHeaderCellStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedFiles.map((rosbag, index) => (
            <tr key={index} style={selectedFiles.has(rosbag.rosbag) ? selectedRowStyle : undefined}>
              <td style={tableCellStyle}>
                <input
                  type="checkbox"
                  checked={selectedFiles.has(rosbag.rosbag)}
                  onChange={() => onCheckboxChange(rosbag.rosbag)}
                />
              </td>
              <td style={tableCellStyle}>{rosbag.rosbag}</td>
              <td style={tableCellStyle}>{new Date(rosbag.time * 1000).toLocaleString()}</td>
              <td style={tableCellStyle}>{formatBytes(rosbag.size)}</td>
              <td style={{ ...tableCellStyle, ...fixedStatusColumnStyle }}>
                {rosbag.status === "COMPLETED"
                  ? "COMPLETED"
                  : rosbag.status === "PENDING"
                    ? "PENDING"
                    : rosbag.progress > 0
                      ? `${rosbag.progress.toFixed(2)}%`
                      : "READY"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UploadTable;
