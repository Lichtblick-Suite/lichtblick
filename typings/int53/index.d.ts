declare module "int53" {
  export function writeInt64LE(number: number, buff: Buffer, offset: number): void;
  export function writeUInt64LE(number: number, buff: Buffer, offset: number): void;

  export function readInt64LE(buff: Buffer, offset: number): number;
  export function readUInt64LE(buff: Buffer, offset: number): number;
}
