// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

namespace Bzip2 {
  declare function decompressFile(buff: Buffer): Buffer;
}

declare module "compressjs" {
  export const Bzip2: Bzip2;
}

declare module "compressjs/lib/Bzip2" {
  export default Bzip2;
}
