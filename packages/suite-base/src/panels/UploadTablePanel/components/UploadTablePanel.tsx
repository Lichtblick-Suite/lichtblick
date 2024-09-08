// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { UploadTable } from "../components/UploadTable";
import { UploadActions } from "../components/UploadActions";
import { useRosbags } from "../hooks/useRosbags";
import { PanelExtensionContext } from "@lichtblick/suite";

export function UploadTablePanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [bucket, setBucket] = useState<string>(""); // State to hold the S3 bucket name
  const [sortOrder, setSortOrder] = useState<{ key: string; order: "asc" | "desc" }>({
    key: "time", // Default sorting key is 'time'
    order: "desc", // Default order is descending
  });

  const {
    rosbags,
    selectedFiles,
    handleCheckboxChange,
    handleUpload,
    handleUploadAll,
    handleDelete,
  } = useRosbags(context);

  // useEffect to fetch the S3 bucket name when the panel is first rendered
  useEffect(() => {
    if (!context.callService) return;

    // Calling the ROS service to get the bucket parameter
    context
      .callService("/rosbag_uploader/get_parameters", { names: ["bucket"] })
      .then((response: any) => {
        const bucketValue = response?.values?.[0]?.string_value || "";
        setBucket(bucketValue);
      })
      .catch(() => setBucket("")); // Handle errors by setting bucket to an empty string
  }, [context]);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Upload Files Table</h2>
      {/* UploadTable component displays the rosbags and allows sorting and selection */}
      <UploadTable
        rosbags={rosbags}
        selectedFiles={selectedFiles}
        onCheckboxChange={handleCheckboxChange}
        onSort={(key) =>
          setSortOrder((prevSortOrder) => ({
            key,
            order: prevSortOrder.key === key && prevSortOrder.order === "desc" ? "asc" : "desc",
          }))
        }
        sortOrder={sortOrder}
      />

      {/* UploadActions component handles file actions like upload and delete */}
      <UploadActions
        bucket={bucket}
        selectedFiles={selectedFiles}
        onUpload={handleUpload}
        onUploadAll={handleUploadAll}
        onDelete={handleDelete}
      />
    </div>
  );
}

export function initUploadTablePanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<UploadTablePanel context={context} />, context.panelElement);

  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}
