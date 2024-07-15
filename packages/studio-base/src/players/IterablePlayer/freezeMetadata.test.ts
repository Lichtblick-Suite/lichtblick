import { Metadata } from "@foxglove/studio";
import { freezeMetadata } from "@foxglove/studio-base/players/IterablePlayer/freezeMetadata";

describe("freezeMetadata", () => {
  const metadata: Metadata[] = [
    { name: "Metadata1", metadata: { key: "value1" } },
    { name: "Metadata2", metadata: { key: "value2" } },
  ];

  freezeMetadata(metadata);

  const wrongMetadata: Metadata = { name: "WrongMetadata", metadata: { key: "test" } };

  afterEach(() => {
    // Expect data to be unchanged after all tests, even throwing error.
    expect(metadata.length).toBe(2);
    expect(metadata[0]?.name).toBe("Metadata1");
    expect(metadata[0]?.metadata.key).toBe("value1");
    expect(metadata[1]?.name).toBe("Metadata2");
    expect(metadata[1]?.metadata.key).toBe("value2");

    expect(metadata[2]).toBeUndefined();
  });

  it("should access successfully all properties", () => {
    // Does it on 'afterEach' function.
  });

  it("should fail when attempting to change the metadata array", () => {
    // Can't add a new metadata entry in the array
    expect(() => {
      metadata.push(wrongMetadata);
    }).toThrow();

    // Can't replace a metadata entry
    expect(() => {
      metadata[0] = wrongMetadata;
    }).toThrow();

    // Can't remove metadata
    expect(() => {
      metadata.pop();
    }).toThrow();
  });

  it("should fail when attempting to change the metadata name", () => {
    expect(() => {
      // @ts-ignore Force typescript to ignore type check for readonly
      metadata[0].name = "Wrong name";
    }).toThrow();
  });

  it("should fail when attempting to change the metadata record", () => {
    // Can't replace the metadata
    expect(() => {
      // @ts-ignore Force typescript to ignore type check for readonly
      metadata[0].metadata = {};
    }).toThrow();

    // Can't delete a key from the metadata
    expect(() => {
      // @ts-ignore Force typescript to ignore type check for readonly
      delete metadata[0].metadata.key;
    }).toThrow();

    // Can't add a new key on metadata record
    expect(() => {
      // @ts-ignore Force typescript to ignore type check for readonly
      metadata[0].metadata["wrongKey"] = "wrongMetadata";
    }).toThrow();

    // Can't replace a value from a specific key of metadata record
    expect(() => {
      // @ts-ignore Force typescript to ignore type check for readonly
      metadata[0].metadata.key = "wrongMetadata";
    }).toThrow();
  });

  it("should freeze an empty array", () => {
    const emptyMetadata: Metadata[] = [];

    freezeMetadata(emptyMetadata);

    expect(() => {
      metadata.push(wrongMetadata);
    }).toThrow();
  });
});
