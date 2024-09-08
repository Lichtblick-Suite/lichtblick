// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import React from "react";
import {
  buttonContainerStyle,
  buttonWrapperStyle,
  buttonStyle,
  messageContainerStyle,
} from "../styles/styles";

interface UploadActionsProps {
  bucket: string;
  selectedFiles: Set<string>;
  onUpload: () => void;
  onUploadAll: () => void;
  onDelete: () => void;
}

export const UploadActions: React.FC<UploadActionsProps> = ({
  bucket,
  selectedFiles,
  onUpload,
  onUploadAll,
  onDelete,
}) => {
  // Display an appropriate message based on the status of the bucket or selected files
  const uploadMessage = !bucket
    ? "No S3 bucket found."
    : selectedFiles.size === 0
      ? "No files selected."
      : "";

  return (
    <div style={buttonContainerStyle}>
      <div style={buttonWrapperStyle}>
        <button onClick={onUploadAll} style={buttonStyle} disabled={!bucket}>
          Upload All
        </button>
        <div style={messageContainerStyle}>{!bucket && <div>No S3 bucket found.</div>}</div>
      </div>
      <div style={buttonWrapperStyle}>
        <button
          onClick={onUpload}
          style={buttonStyle}
          disabled={!bucket || selectedFiles.size === 0}
        >
          Upload
        </button>
        <div style={messageContainerStyle}>{uploadMessage && <div>{uploadMessage}</div>}</div>
      </div>
      <div style={buttonWrapperStyle}>
        <button onClick={onDelete} style={buttonStyle} disabled={selectedFiles.size === 0}>
          Delete
        </button>
        <div style={messageContainerStyle}>
          {selectedFiles.size === 0 && <div>No files selected.</div>}
        </div>
      </div>
    </div>
  );
};

export default UploadActions;
