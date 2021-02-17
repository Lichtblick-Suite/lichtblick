declare module "wasm-lz4" {
  function decompress(...args: unknown[]): Buffer;
  namespace decompress {
    const isLoaded: Promise<boolean>;
  }

  export default decompress;
}
