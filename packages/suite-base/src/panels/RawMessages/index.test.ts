// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { MessagePathDataItem } from "@lichtblick/suite-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import { getSingleValue } from "./index";

describe("getSingleValue", () => {
  it("should return a string with value and constantName if data is a single-element array", () => {
    const data = BasicBuilder.strings({ count: 1 });
    const queriedData = [{ constantName: BasicBuilder.string() }] as MessagePathDataItem[];

    const result = getSingleValue(data, queriedData);

    expect(result).toBe(`${data[0]} (${queriedData[0]?.constantName})`);
  });

  it("should return the data unchanged if data is not a single-element array", () => {
    const data = BasicBuilder.strings();
    const queriedData = [{ constantName: BasicBuilder.string() }] as MessagePathDataItem[];

    const result = getSingleValue(data, queriedData);

    expect(result).toBe(data);
  });

  it("should not handle undefined constantName and return just the value", () => {
    const data = BasicBuilder.strings({ count: 1 });
    const queriedData = [{}] as MessagePathDataItem[];

    const result = getSingleValue(data, queriedData);

    expect(result).toBe(data[0]);
  });

  it("should return the data unchanged if data is not an array", () => {
    const data = BasicBuilder.string();
    const queriedData = [{ constantName: BasicBuilder.string() }] as MessagePathDataItem[];

    const result = getSingleValue(data, queriedData);

    expect(result).toBe(data);
  });

  it("should return the data unchanged if data is an empty array", () => {
    const data: unknown = [];
    const queriedData = [{ constantName: BasicBuilder.string() }] as MessagePathDataItem[];

    const result = getSingleValue(data, queriedData);

    expect(result).toBe(data);
  });
});
