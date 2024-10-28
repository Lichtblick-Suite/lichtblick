// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import * as _ from "lodash-es";
import randomString from "randomstring";

import {
  NumberBuilder,
  StringBuilder,
  Capitalization,
  MapBuilder,
} from "@lichtblick/suite-base/testing/builders/types";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class BasicBuilder {
  public static boolean(): boolean {
    return Boolean(_.random(0, 1));
  }

  public static number({ min = 1, max = 20 }: Partial<NumberBuilder> = {}): number {
    return _.random(min, max);
  }

  public static float(min = 1, max = 20): number {
    return _.random(min, max, true);
  }

  public static string({
    length = 6,
    charset = "alphabetic",
    capitalization,
  }: Partial<StringBuilder> = {}): string {
    let casingFunction = (input: string) => input;
    if (capitalization != undefined) {
      casingFunction = {
        [Capitalization.UPPERCASE]: _.toUpper,
        [Capitalization.LOWERCASE]: _.toLower,
      }[capitalization];
    }

    return casingFunction(
      randomString.generate({
        length,
        charset,
      }),
    );
  }

  public static stringMap({
    count = 3,
    length = 6,
    charset = "alphabetic",
    capitalization,
  }: Partial<MapBuilder> = {}): Map<string, string> {
    const entries: [string, string][] = BasicBuilder.multiple(
      () => [
        BasicBuilder.string({ length, charset, capitalization }),
        BasicBuilder.string({ length, charset, capitalization }),
      ],
      count,
    );

    return new Map(entries);
  }

  public static genericMap<T>(
    valueGenerator: () => T,
    { count = 3, length = 6, charset = "alphabetic", capitalization }: Partial<MapBuilder> = {},
  ): Map<string, T> {
    const entries: [string, T][] = BasicBuilder.multiple(
      () => [BasicBuilder.string({ length, charset, capitalization }), valueGenerator()],
      count,
    );

    return new Map(entries);
  }

  public static genericDictionary<T>(
    valueGenerator: () => T,
    { count = 3, length = 6, charset = "alphabetic", capitalization }: Partial<MapBuilder> = {},
  ): Record<string, T> {
    return _.fromPairs(
      BasicBuilder.multiple(
        () => [BasicBuilder.string({ length, charset, capitalization }), valueGenerator()],
        count,
      ),
    );
  }

  public static multiple<T>(factory: () => T, count = 3): T[] {
    return _.map(new Array(count), factory);
  }

  public static numbers(count = 3): number[] {
    return BasicBuilder.multiple(BasicBuilder.number, count);
  }

  public static strings({
    count = 3,
    length = 6,
    charset = "alphabetic",
    capitalization = undefined,
  }: Partial<
    {
      count: number;
    } & StringBuilder
  > = {}): string[] {
    return BasicBuilder.multiple(
      () => BasicBuilder.string({ length, charset, capitalization }),
      count,
    );
  }

  public static sample<T extends string | symbol | number, K>(
    input: Record<T, K> | K[],
    count: number,
  ): K[];
  public static sample<T extends string | symbol | number, K>(input: Record<T, K> | K[]): K;
  public static sample<T extends string | symbol | number, K>(
    input: Record<T, K> | K[],
    count?: number,
  ): K | K[] {
    return count == undefined ? _.sample(input)! : _.sampleSize(input, count);
  }
}