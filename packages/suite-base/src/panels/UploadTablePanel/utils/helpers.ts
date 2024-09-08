// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

export function generateUUID(): Uint8Array {
  const uuidArray = new Uint8Array(16);
  crypto.getRandomValues(uuidArray);
  return uuidArray;
}

export function formatBytes(bytes: BigInt): string {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === BigInt(0)) return "0 Byte";
  const i = Math.floor(Number(bytes) ? Math.log(Number(bytes)) / Math.log(1024) : 0);
  const size = Number(bytes) / Math.pow(1024, i);
  return size.toFixed(1) + " " + sizes[i];
}
