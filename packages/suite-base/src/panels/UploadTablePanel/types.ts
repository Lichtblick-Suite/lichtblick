// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

export interface RosbagInfo {
  rosbag: string;
  size: BigInt;
  time: number;
  status: string;
  progress: number;
  uuid?: Uint8Array; // Add a uuid field to store the UUID for each file
}

export interface DirectoryInfo {
  path: string;
  size: BigInt;
  used: BigInt;
  free: BigInt;
  rosbags: RosbagInfo[];
}

export interface UploadFilesMessage {
  topic: string;
  message: DirectoryInfo;
}

export interface UploadFeedbackMessage {
  topic: string;
  sizeInBytes: number;
  message: UploadFeedbackInfo;
}

export interface UploadFeedbackInfo {
  goal_id: { uuid: Uint8Array };
  status: {
    rosbag: string;
    bytes_total_size: BigInt;
    bytes_transferred: BigInt;
    status: string;
  };
}

export type SortOrder = "asc" | "desc";

export interface UploadFileResponse {
  success: boolean;
  message: string;
}

export interface UploadFileResponse {
  success: boolean;
  message: string;
}
