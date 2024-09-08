// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useLayoutEffect, useState, useRef, useCallback } from "react";
import {
  RosbagInfo,
  UploadFeedbackMessage,
  UploadFilesMessage,
  UploadFileResponse,
} from "../types";
import { generateUUID } from "../utils/helpers";
import { PanelExtensionContext } from "@lichtblick/suite";

// Custom hook to manage rosbag files and related actions
export function useRosbags(context: PanelExtensionContext | undefined) {
  const [rosbags, setRosbags] = useState<RosbagInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clears the timeout and resets it to clear the rosbag list after 5 seconds
  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setRosbags([]);
    }, 5000);
  }, []);

  // Handles feedback messages from the upload process and updates the status and progress of rosbags
  const handleFeedback = useCallback((feedbackMessages: UploadFeedbackMessage[]) => {
    const feedback = feedbackMessages[feedbackMessages.length - 1]?.message;
    if (!feedback) return;

    // Update the progress or completion status of the corresponding rosbag
    setRosbags((prevRosbags) =>
      prevRosbags.map((rosbag) =>
        rosbag.rosbag === feedback.status.rosbag
          ? {
              ...rosbag,
              status: feedback.status.status === "COMPLETED" ? "COMPLETED" : "UPLOADING",
              progress:
                feedback.status.status === "COMPLETED"
                  ? 100
                  : (Number(feedback.status.bytes_transferred) /
                      Number(feedback.status.bytes_total_size)) *
                    100,
            }
          : rosbag,
      ),
    );
  }, []);

  // Processes the file information received from the /directory_info topic and updates the rosbag list
  const handleDirectoryInfo = useCallback(
    (fileMessages: UploadFilesMessage[]) => {
      const directoryInfo = fileMessages[0]?.message;
      if (!directoryInfo) return;

      setRosbags((prevRosbags) => {
        const fileMap = new Map(prevRosbags.map((rosbag) => [rosbag.rosbag, rosbag]));
        return directoryInfo.rosbags
          .filter((rosbag) => rosbag.size !== 0n)
          .map((rosbag) => ({
            ...rosbag,
            status: fileMap.get(rosbag.rosbag)?.status || "READY",
            progress: fileMap.get(rosbag.rosbag)?.progress || 0,
            uuid: fileMap.get(rosbag.rosbag)?.uuid,
          }));
      });

      resetTimeout();
    },
    [resetTimeout],
  );

  useLayoutEffect(() => {
    if (!context) return;

    context.onRender = (renderState, done) => {
      const fileMessages = renderState.currentFrame?.filter(
        (msg) => msg.topic === "/directory_info",
      ) as UploadFilesMessage[] | undefined;

      if (fileMessages) handleDirectoryInfo(fileMessages);

      const feedbackMessages = renderState.currentFrame?.filter(
        (msg) => msg.topic === "/upload_rosbag/_action/feedback",
      ) as UploadFeedbackMessage[] | undefined;

      if (feedbackMessages) handleFeedback(feedbackMessages);

      done();
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.subscribe([{ topic: "/directory_info" }, { topic: "/upload_rosbag/_action/feedback" }]);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [context, handleDirectoryInfo, handleFeedback]);

  // Toggles the selection of a rosbag when the checkbox is clicked
  const handleCheckboxChange = useCallback(
    (rosbag: string) => {
      setSelectedFiles((prevSelectedFiles) => {
        const newSelectedFiles = new Set(prevSelectedFiles);
        newSelectedFiles.has(rosbag)
          ? newSelectedFiles.delete(rosbag)
          : newSelectedFiles.add(rosbag);
        return newSelectedFiles;
      });
    },
    [setSelectedFiles],
  );

  // Handles uploading of selected rosbags
  const handleUpload = useCallback(() => {
    if (!context || !context.callService) {
      console.error("context or callService is undefined");
      return;
    }

    Array.from(selectedFiles).forEach((rosbag) => {
      const goalId = generateUUID();
      setRosbags((prevRosbags) =>
        prevRosbags.map((rosbagItem) =>
          rosbagItem.rosbag === rosbag
            ? { ...rosbagItem, status: "PENDING", uuid: goalId }
            : rosbagItem,
        ),
      );

      context
        .callService?.("/upload_rosbag/_action/send_goal", {
          goal_id: { uuid: goalId },
          rosbag,
        })
        .then((response: unknown) => {
          const res = response as UploadFileResponse;
          if (res.success) {
            console.log(`File ${rosbag} uploaded successfully.`);
          } else {
            console.error(`Failed to upload file ${rosbag}: ${res.message}`);
          }
        })
        .catch((error: Error) => console.error(`Error calling service for file ${rosbag}:`, error));

      setSelectedFiles(new Set()); // Clear selected files after upload
    });
  }, [context, selectedFiles]);

  // Handles uploading of all rosbags
  const handleUploadAll = useCallback(() => {
    if (!context || !context.callService) {
      console.error("context or callService is undefined");
      return;
    }

    rosbags.forEach((rosbagItem) => {
      const goalId = generateUUID();
      setRosbags((prevRosbags) =>
        prevRosbags.map((rosbag) =>
          rosbag.rosbag === rosbagItem.rosbag
            ? { ...rosbag, status: "PENDING", uuid: goalId }
            : rosbag,
        ),
      );

      context
        .callService?.("/upload_rosbag/_action/send_goal", {
          goal_id: { uuid: goalId },
          rosbag: rosbagItem.rosbag,
        })
        .then((response: unknown) => {
          const res = response as UploadFileResponse;
          if (res.success) {
            console.log(`File ${rosbagItem.rosbag} uploaded successfully.`);
          } else {
            console.error(`Failed to upload file ${rosbagItem.rosbag}: ${res.message}`);
          }
        })
        .catch((error: Error) =>
          console.error(`Error calling service for file ${rosbagItem.rosbag}:`, error),
        );
    });
  }, [context, rosbags]);

  const handleDelete = useCallback(() => {
    if (!context || !context.callService) return;

    Array.from(selectedFiles).forEach((rosbag) => {
      context
        .callService?.("/delete_rosbag", { rosbag })
        .then((response: unknown) => {
          const res = response as UploadFileResponse;
          if (res.success) {
            console.log(`File ${rosbag} deleted successfully.`);
          } else {
            console.error(`Failed to delete file ${rosbag}: ${res.message}`);
          }
        })
        .catch((error: Error) => console.error(`Error calling service for file ${rosbag}:`, error));
    });

    clearSelectedFiles();
  }, [context, selectedFiles]);

  const clearSelectedFiles = () => {
    setSelectedFiles(new Set());
  };

  return {
    rosbags,
    selectedFiles,
    handleCheckboxChange,
    handleUpload,
    handleUploadAll,
    handleDelete,
    clearSelectedFiles,
  };
}
