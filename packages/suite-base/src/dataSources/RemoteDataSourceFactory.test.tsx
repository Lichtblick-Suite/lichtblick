/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { isFileExtensionAllowed, checkExtensionMatch } from "./RemoteDataSourceFactory";

describe("isFileExtensionAllowed", () => {
  it("should throw an error if extension passed isn't allowed", () => {
    const mockExtenstion = ".json";

    expect(() => {
      isFileExtensionAllowed(mockExtenstion);
    }).toThrow();
  });

  it("shouldn't throw an error if extension passed is allowed", () => {
    const mockExtenstion = ".mcap";

    expect(() => {
      isFileExtensionAllowed(mockExtenstion);
    }).not.toThrow();
  });
});

describe("checkExtensionMatch", () => {
  it("shouldn't throw an error if the comparator is undefined", () => {
    const mockExtenstion = ".mcap";

    const result = checkExtensionMatch(mockExtenstion);

    expect(result).toBe(mockExtenstion);
  });

  it("should return the extension when the comparator and comparing extensions are equal", () => {
    const mockExtenstion = ".mcap";
    const comparatorExtension = ".mcap";

    const result = checkExtensionMatch(mockExtenstion, comparatorExtension);

    expect(result).toBe(mockExtenstion);
  });
});
