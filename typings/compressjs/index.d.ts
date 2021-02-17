namespace Bzip2 {
  declare function decompressFile(buff: Buffer): Buffer;
}

declare module "compressjs" {
  export const Bzip2: Bzip2;
}

declare module "compressjs/lib/Bzip2" {
  export default Bzip2;
}
