// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PanelExtensionContext } from "@lichtblick/suite";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";

interface RosbagInfo {
  rosbag: string;
  size: BigInt;
  time: number;
  status: string;
  progress: number;
  uuid?: Uint8Array; // Add a uuid field to store the UUID for each file
}

interface DirectoryInfo {
  path: string;
  size: BigInt;
  used: BigInt;
  free: BigInt;
  rosbags: RosbagInfo[];
}

interface UploadFilesMessage {
  topic: string;
  message: DirectoryInfo;
}

interface UploadFeedbackMessage {
  topic: string;
  sizeInBytes: number;
  message: UploadFeedbackInfo;
}

interface UploadFeedbackInfo {
  goal_id: { uuid: Uint8Array };
  status: {
    rosbag: string;
    bytes_total_size: BigInt;
    bytes_transferred: BigInt;
    status: string;
  };
}

type SortOrder = "asc" | "desc";

interface UploadFileResponse {
  success: boolean;
  message: string;
}

// Function to generate a UUID-like Uint8Array
function generateUUID(): Uint8Array {
  const uuidArray = new Uint8Array(16);
  crypto.getRandomValues(uuidArray);
  return uuidArray;
}

// Helper function to convert bytes to human-readable format
function formatBytes(bytes: BigInt): string {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === BigInt(0)) return "0 Byte";
  const i = Math.floor(Number(bytes) ? Math.log(Number(bytes)) / Math.log(1024) : 0);
  const size = Number(bytes) / Math.pow(1024, i);
  return size.toFixed(1) + " " + sizes[i];
}

export function UploadTablePanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [rosbags, setRosbags] = useState<RosbagInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();
  const [sortOrder, setSortOrder] = useState<{ key: string; order: SortOrder }>({
    key: "time",
    order: "desc",
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<RosbagInfo[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCheckboxChange = (rosbag: string) => {
    setSelectedFiles((prevSelectedFiles) => {
      const newSelectedFiles = new Set(prevSelectedFiles);
      if (newSelectedFiles.has(rosbag)) {
        newSelectedFiles.delete(rosbag);
      } else {
        newSelectedFiles.add(rosbag);
      }
      return newSelectedFiles;
    });
  };

  const callUploadService = (rosbag: string) => {
    if (context.callService) {
      const goalId = generateUUID(); // Generate a random UUID array
      console.log(goalId);
      setRosbags((prevRosbags) =>
        prevRosbags.map((rosbagItem) =>
          rosbagItem.rosbag === rosbag
            ? { ...rosbagItem, status: "PENDING", uuid: goalId }
            : rosbagItem,
        ),
      );
      context
        .callService("/upload_rosbag/_action/send_goal", {
          goal_id: { uuid: goalId },
          rosbag: rosbag,
        })
        .then((response: unknown) => {
          const res = response as UploadFileResponse;
          if (res.success) {
            console.log(`File ${rosbag} uploaded successfully.`);
          } else {
            console.error(`Failed to upload file ${rosbag}: ${res.message}`);
          }
          setSelectedFiles(new Set()); // Clear selected files after upload
        })
        .catch((error: Error) => {
          console.error(`Error calling service for file ${rosbag}:`, error);
        });
    } else {
      console.error("callService is not available in the context.");
    }
  };

  const callDeleteService = (rosbag: string) => {
    if (context.callService) {
      context
        .callService("/delete_rosbag", { rosbag: rosbag })
        .then((response: unknown) => {
          const res = response as UploadFileResponse;
          if (res.success) {
            console.log(`File ${rosbag} deleted successfully.`);
          } else {
            console.error(`Failed to delete file ${rosbag}: ${res.message}`);
          }
        })
        .catch((error: Error) => {
          console.error(`Error calling service for file ${rosbag}:`, error);
        });
    } else {
      console.error("callService is not available in the context.");
    }
  };

  const handleUploadClick = () => {
    Array.from(selectedFiles).forEach((rosbag) => {
      callUploadService(rosbag);
    });
  };

  const handleUploadAllClick = () => {
    rosbags.forEach((rosbagItem) => {
      callUploadService(rosbagItem.rosbag);
    });

    // Select all checkboxes
    setSelectedFiles(new Set(rosbags.map((rosbagItem) => rosbagItem.rosbag)));
  };

  const handleDeleteClick = () => {
    const selectedFileObjects = rosbags.filter((rosbag) => selectedFiles.has(rosbag.rosbag));
    setFilesToDelete(selectedFileObjects);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    filesToDelete.forEach((rosbag) => {
      callDeleteService(rosbag.rosbag);
    });
    setShowDeleteConfirmation(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const handleSort = (key: string) => {
    setSortOrder((prevSortOrder) => {
      const newOrder = prevSortOrder.key === key && prevSortOrder.order === "desc" ? "asc" : "desc";
      return { key, order: newOrder };
    });
  };

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

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setRosbags([]);
    }, 5000); // 5 seconds timeout
  };

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);

      const fileMessages = renderState.currentFrame?.filter(
        (msg) => msg.topic === "/directory_info",
      ) as UploadFilesMessage[] | undefined;

      if (fileMessages && fileMessages.length > 0 && fileMessages[0]?.message) {
        const directoryInfo = fileMessages[0].message;
        setRosbags((prevRosbags) => {
          const fileMap = new Map(prevRosbags.map((rosbag) => [rosbag.rosbag, rosbag]));
          const updatedFiles = directoryInfo.rosbags
            .filter((rosbag) => rosbag.size !== 0n) // Filter files with size > 0
            .map((rosbag) => {
              const existingFile = fileMap.get(rosbag.rosbag);
              return existingFile
                ? {
                    ...rosbag,
                    status: existingFile.status,
                    progress: existingFile.progress,
                    uuid: existingFile.uuid,
                  }
                : {
                    ...rosbag,
                    status: "READY", // Set default status to READY
                    progress: 0,
                    uuid: undefined,
                  };
            });

          return updatedFiles;
        });
        resetTimeout();
      }

      const feedbackMessages = renderState.currentFrame?.filter(
        (msg) => msg.topic === "/upload_rosbag/_action/feedback",
      ) as UploadFeedbackMessage[] | undefined;

      if (feedbackMessages && feedbackMessages.length > 0) {
        const feedback = feedbackMessages[feedbackMessages.length - 1];
        if (feedback) {
          const feedbackInfo = feedback.message;
          setRosbags((prevRosbags) => {
            const updatedFiles = prevRosbags.map((rosbag) => {
              if (rosbag.rosbag === feedbackInfo.status.rosbag) {
                const newProgress =
                  feedbackInfo.status.status === "COMPLETED"
                    ? 100
                    : (Number(feedbackInfo.status.bytes_transferred) /
                        Number(feedbackInfo.status.bytes_total_size)) *
                      100;

                // Check if progress value dropped back to 0
                if (newProgress === 0) {
                  console.warn(`Warning: File ${rosbag.rosbag} progress reset to 0%`);
                  console.log("Full message:", feedbackInfo);
                }

                return {
                  ...rosbag,
                  status: feedbackInfo.status.status === "COMPLETED" ? "COMPLETED" : "UPLOADING",
                  progress: newProgress,
                };
              }
              return rosbag;
            });

            return updatedFiles;
          });
        }
      }
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.subscribe([{ topic: "/directory_info" }, { topic: "/upload_rosbag/_action/feedback" }]);
  }, [context]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const mergeStyles = (...styles: React.CSSProperties[]): React.CSSProperties =>
    Object.assign({}, ...styles);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Upload Files Table</h2>
      <div style={{ maxHeight: "60vh", overflowY: "auto", border: "1px solid black" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={tableHeaderCellStyle}>Select</th>
              <th style={tableHeaderCellStyle}>File Name</th>
              <th style={tableHeaderCellStyle} onClick={() => handleSort("time")}>
                Date Time
              </th>
              <th style={tableHeaderCellStyle} onClick={() => handleSort("size")}>
                Size
              </th>
              <th style={mergeStyles(tableHeaderCellStyle, fixedStatusColumnStyle)}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedFiles.map((rosbag, index) => (
              <tr
                key={index}
                style={selectedFiles.has(rosbag.rosbag) ? selectedRowStyle : undefined}
              >
                <td style={tableCellStyle}>
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(rosbag.rosbag)}
                    onChange={() => handleCheckboxChange(rosbag.rosbag)}
                  />
                </td>
                <td style={tableCellStyle}>{rosbag.rosbag}</td>
                <td style={tableCellStyle}>{new Date(rosbag.time * 1000).toLocaleString()}</td>
                <td style={tableCellStyle}>{formatBytes(rosbag.size)}</td>
                <td style={mergeStyles(tableCellStyle, fixedStatusColumnStyle)}>
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
      <button onClick={handleUploadAllClick} style={{ margin: "1rem" }}>
        Upload All
      </button>
      <button onClick={handleUploadClick} style={{ margin: "1rem" }}>
        Upload
      </button>
      <button onClick={handleDeleteClick} style={{ margin: "1rem" }}>
        Delete
      </button>

      {showDeleteConfirmation && (
        <div style={confirmationDialogStyle}>
          <h3>Confirm Delete</h3>
          <p>Are you sure you want to delete the following files?</p>
          <ul>
            {filesToDelete.map((rosbag) => (
              <li key={rosbag.rosbag}>{rosbag.rosbag}</li>
            ))}
          </ul>
          <button onClick={confirmDelete} style={{ margin: "1rem" }}>
            Delete
          </button>
          <button onClick={cancelDelete} style={{ margin: "1rem" }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

const tableHeaderCellStyle: React.CSSProperties = {
  border: "1px solid black",
  padding: "8px",
  textAlign: "left",
  backgroundColor: "#f2f2f2",
  cursor: "pointer",
};

const tableCellStyle: React.CSSProperties = {
  border: "1px solid black",
  padding: "8px",
  textAlign: "left",
};

const selectedRowStyle: React.CSSProperties = {
  backgroundColor: "#e0f7fa",
};

const fixedStatusColumnStyle: React.CSSProperties = {
  width: "100px", // Set a fixed width for the status column
  textAlign: "center",
};

const confirmationDialogStyle: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  backgroundColor: "white",
  border: "1px solid black",
  padding: "1rem",
  zIndex: 1000,
};

export function initUploadTablePanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<UploadTablePanel context={context} />, context.panelElement);

  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}
