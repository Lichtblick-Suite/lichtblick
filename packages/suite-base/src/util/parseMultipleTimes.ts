// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Chrono } from "chrono-node";
import { DateTime } from "luxon";

export const parseTimestampStr = (timeStr: string): number | undefined => {
  if (!timeStr.trim()) {
    return undefined;
  } // Handle empty strings explicitly

  const timeNumber = Number(timeStr);

  if (!isNaN(timeNumber)) {
    // If input is a number, assume it's a Unix timestamp in seconds
    return timeNumber;
  }

  // Use Chrono to parse various string formats

  const parsed = new Chrono().parseDate(timeStr);
  if (parsed instanceof Date) {
    return DateTime.fromJSDate(parsed).toSeconds();
  }

  return undefined; // Explicitly return undefined if parsing fails
};
