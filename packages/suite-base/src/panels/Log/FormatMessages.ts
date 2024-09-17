import { NormalizedLogMessage } from "@lichtblick/suite-base/panels/Log/types";
import LevelToString from "./LevelToString";
import { formatTime } from "@lichtblick/suite-base/util/formatTime";

import * as _ from "lodash-es";

const formattedMessage = (item: NormalizedLogMessage): string => {
  return `[${LevelToString(item.level)}] [${formatTime(item.stamp)}] ${!_.isEmpty(item.name) ? `[${item.name}]` : ""} ${item.message}`;
};

export default function formatMessages(items: NormalizedLogMessage[]): string[] {
  const messages = items.map((item) => formattedMessage(item));
  return messages;
}
