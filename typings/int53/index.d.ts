// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

declare module "int53" {
  export function writeInt64LE(number: number, buff: Buffer, offset: number): void;
  export function writeUInt64LE(number: number, buff: Buffer, offset: number): void;

  export function readInt64LE(buff: Buffer, offset: number): number;
  export function readUInt64LE(buff: Buffer, offset: number): number;
}
