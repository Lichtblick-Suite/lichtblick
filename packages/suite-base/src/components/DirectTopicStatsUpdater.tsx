// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import { useTopicPublishFrequencies } from "@lichtblick/suite-base/hooks/useTopicPublishFrequences";
import { PlayerCapabilities, TopicStats } from "@lichtblick/suite-base/players/types";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useLatest } from "react-use";

import { Time } from "@foxglove/rostime";

const EM_DASH = "\u2014";
const EMPTY_TOPIC_STATS = new Map<string, TopicStats>();

const selectTopicStats = (ctx: MessagePipelineContext) =>
  ctx.playerState.activeData?.topicStats ?? EMPTY_TOPIC_STATS;
const selectPlayerId = (ctx: MessagePipelineContext) => ctx.playerState.playerId;
const selectPlayerCapabilities = (ctx: MessagePipelineContext) => ctx.playerState.capabilities;

type StatSample = {
  time: Time;
  count: number;
  frequency: undefined | number;
};

/**
 * Encapsulates logic for directly updating topic stats DOM elements, bypassing
 * react for performance. To use this component mount it directly under your component
 * containing topics you want to update. Tag each topic stat field with data-topic
 * and data-topic-stat attributes.
 *
 * @property interval - the interval, in frames, between updates.
 */
export function DirectTopicStatsUpdater({ interval = 1 }: { interval?: number }): JSX.Element {
  const topicStats = useMessagePipeline(selectTopicStats);
  const playerCapabilities = useMessagePipeline(selectPlayerCapabilities);
  const playerId = useMessagePipeline(selectPlayerId);

  const latestStats = useLatest(topicStats);
  const updateCount = useRef(0);
  const rootRef = useRef<HTMLDivElement>(ReactNull);
  const samplesByTopic = useRef<Record<string, StatSample>>({});

  const frequenciesByTopic = useTopicPublishFrequencies();
  const latestFrequenciesByTopic = useLatest(frequenciesByTopic);

  const playerIsStaticSource = useMemo(
    () => playerCapabilities.includes(PlayerCapabilities.playbackControl),
    [playerCapabilities],
  );

  const updateStats = useCallback(() => {
    if (!rootRef.current) {
      return;
    }

    rootRef.current.parentElement?.querySelectorAll("[data-topic]").forEach((field) => {
      if (!(field instanceof HTMLElement) || !field.dataset.topic) {
        return;
      }

      const topic = field.dataset.topic;
      const stat = latestStats.current.get(topic);
      if (field.dataset.topicStat === "count") {
        if (stat) {
          field.innerText = stat.numMessages.toLocaleString();
        } else {
          field.innerText = EM_DASH;
        }
      }

      if (field.dataset.topicStat === "frequency") {
        const frequency = latestFrequenciesByTopic.current[topic];
        field.innerText = frequency != undefined ? `${frequency.toFixed(2)} Hz` : EM_DASH;
      }
    });
  }, [latestFrequenciesByTopic, latestStats]);

  // Update when new "data-topic" nodes are added, to support virtualized lists and filtering.
  useEffect(() => {
    if (!rootRef.current?.parentElement) {
      return;
    }
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          // updateStats() triggers mutations of text nodes, so only update if HTMLElements are added to avoid infinite loops
          if (node instanceof HTMLElement && node.querySelector("[data-topic]")) {
            updateStats();
            return;
          }
        }
      }
    });
    observer.observe(rootRef.current.parentElement, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [updateStats]);

  useEffect(() => {
    if (updateCount.current++ % interval === 0) {
      updateStats();
    }
  }, [updateStats, interval, topicStats, playerIsStaticSource]);

  // Clear previous samples on player change.
  useEffect(() => {
    void playerId;
    samplesByTopic.current = {};
  }, [playerId]);

  useLayoutEffect(() => {
    updateStats();
  }, [updateStats]);

  return <div ref={rootRef} style={{ display: "none" }} />;
}
