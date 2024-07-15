import { McapUnindexedIterableSource } from "@foxglove/studio-base/players/IterablePlayer/Mcap/McapUnindexedIterableSource";
import { McapWriter, TempBuffer } from "@mcap/core";

describe("McapUnindexedIterableSource", () => {
  it("returns the correct metadata", async () => {
    const tempBuffer = new TempBuffer();

    const writer = new McapWriter({ writable: tempBuffer });
    await writer.start({ library: "", profile: "" });
    await writer.addMetadata({
      name: "metadata1",
      metadata: new Map(Object.entries({ key: "value" })),
    });
    await writer.end();

    const file = new Blob([tempBuffer.get()]);

    const source = new McapUnindexedIterableSource({
      size: file.size,
      stream: file.stream(),
    });

    const { metadata } = await source.initialize();

    expect(metadata).toBeDefined();
    expect(metadata).toEqual([
      {
        name: "metadata1",
        metadata: { key: "value" },
      },
    ]);
  });

  it("returns an empty array when no metadata is on the file", async () => {
    const tempBuffer = new TempBuffer();

    const writer = new McapWriter({ writable: tempBuffer });
    await writer.start({ library: "", profile: "" });
    await writer.end();

    const file = new Blob([tempBuffer.get()]);

    const source = new McapUnindexedIterableSource({
      size: file.size,
      stream: file.stream(),
    });

    const { metadata } = await source.initialize();

    expect(metadata).toBeDefined();
    expect(metadata).toEqual([]);
  });
});
