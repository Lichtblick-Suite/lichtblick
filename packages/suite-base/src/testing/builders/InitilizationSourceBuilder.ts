// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Initalization } from "@lichtblick/suite-base/players/IterablePlayer/IIterableSource";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import RosTimeBuilder from "@lichtblick/suite-base/testing/builders/RosTimeBuilder";
import { defaults } from "@lichtblick/suite-base/testing/builders/utilities";

export default class InitilizationSourceBuilder {
  public static initialization(props: Partial<Initalization> = {}): Initalization {
    return defaults<Initalization>(props, {
      start: RosTimeBuilder.time(),
      end: RosTimeBuilder.time(),
      datatypes: new Map(),
      publishersByTopic: new Map(),
      topicStats: new Map(),
      problems: [],
      topics: [],
      metadata: [],
      profile: BasicBuilder.string(),
      name: BasicBuilder.string(),
    });
  }
}
