// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { compare } from "@lichtblick/rostime";
import { Initalization } from "@lichtblick/suite-base/players/IterablePlayer/IIterableSource";
import { OptionalMessageDefinition } from "@lichtblick/suite-base/types/RosDatatypes";

/**
 * Validates whether the time range of the current MCAP file overlaps
 * with the accumulated time range of previously merged MCAPs.
 *
 * Overlap is detected if:
 * - The current MCAP starts within the accumulated range.
 * - The current MCAP ends within the accumulated range.
 * - The current MCAP fully wraps around the accumulated range.
 *
 * If an overlap is found, a warning is added to the `problems` list,
 * indicating potential issues with functionalities relying on non-overlapping time ranges.
 *
 * This validation ensures that merged MCAPs maintain consistent and
 * non-conflicting time intervals, preventing unexpected behaviors in playback.
 */
export const validateOverlap = (accumulated: Initalization, current: Initalization): void => {
  const startsInside =
    compare(current.start, accumulated.start) >= 0 && compare(current.start, accumulated.end) <= 0;
  const endsInside =
    compare(current.end, accumulated.start) >= 0 && compare(current.end, accumulated.end) <= 0;
  const wrapsAround =
    compare(current.start, accumulated.start) < 0 && compare(current.end, accumulated.end) > 0;

  if (startsInside || endsInside || wrapsAround) {
    accumulated.problems.push({
      message: "MCAP time overlap detected. Some functionalities may not work as expected.",
      severity: "warn",
      tip: "Check the time range of the MCAPs",
    });
  }
};

/**
 * Validates that topics maintain a consistent datatype across all MCAPs.
 *
 * - If a topic already exists in `accumulated` but has a different datatype,
 *   a warning is added to `accumulated.problems`.
 * - If the topic is new, it is safe to add it to the `accumulated` map.
 */
export const validateAndAddDatatypes = (
  accumulated: Initalization,
  current: Initalization,
): void => {
  const isSameDatatype = (a: OptionalMessageDefinition, b: OptionalMessageDefinition): boolean => {
    return JSON.stringify(a.definitions) === JSON.stringify(b.definitions);
  };

  for (const [datatype, currentDefinition] of current.datatypes) {
    const accumulatedDefinition = accumulated.datatypes.get(datatype);

    if (accumulatedDefinition && !isSameDatatype(accumulatedDefinition, currentDefinition)) {
      accumulated.problems.push({
        message: `Datatype mismatch detected for ${datatype}. Merging may cause issues.`,
        severity: "warn",
        tip: "Ensure all MCAPs use the same schema for each datatype.",
      });
    } else if (!accumulatedDefinition) {
      accumulated.datatypes.set(datatype, currentDefinition);
    }
  }
};

/**
 * Validates and accumulates topics, ensuring unique topic names with consistent schemaNames.
 */
export const validateAndAddNewTopics = (
  accumulated: Initalization,
  current: Initalization,
): void => {
  for (const topic of current.topics) {
    const existingTopic = accumulated.topics.find((t) => t.name === topic.name);

    if (existingTopic) {
      if (existingTopic.schemaName !== topic.schemaName) {
        accumulated.problems.push({
          message: `Schema name mismatch detected for topic "${topic.name}". Expected "${existingTopic.schemaName}", but found "${topic.schemaName}".`,
          severity: "warn",
          tip: "Ensure all MCAPs use a consistent schema for this topic.",
        });
      }
    } else {
      accumulated.topics.push(topic);
    }
  }
};
