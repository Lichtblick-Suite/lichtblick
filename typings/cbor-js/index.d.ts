declare module "cbor-js" {
  export function encode(obj: unknown): ArrayBuffer;
  export function decode(buffer: ArrayBuffer): unknown;
}
