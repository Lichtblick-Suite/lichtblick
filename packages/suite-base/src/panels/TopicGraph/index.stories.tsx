// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import PanelSetup, { Fixture } from "@lichtblick/suite-base/stories/PanelSetup";
import delay from "@lichtblick/suite-base/util/delay";
import { StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { useAsync } from "react-use";

import TopicGraph, { TopicVisibility } from "./index";

export default {
  title: "panels/TopicGraph",
  component: TopicGraph,
};

export const Empty: StoryObj = {
  render: () => {
    return (
      <PanelSetup>
        <TopicGraph />
      </PanelSetup>
    );
  },
};

export const WithSettings: StoryObj = {
  render: function Story() {
    return (
      <PanelSetup includeSettings>
        <TopicGraph />
      </PanelSetup>
    );
  },

  parameters: {
    colorScheme: "light",
  },
};

function TopicsStory({
  topicVisibility: initialTopicVisibility,
}: {
  topicVisibility: TopicVisibility;
}) {
  const [fixture] = useState<Fixture>({
    frame: {},
    topics: [{ name: "/topic", schemaName: "std_msgs/Header" }],
    activeData: {
      publishedTopics: new Map([
        ["/topic", new Set(["pub-1", "pub-2"])],
        ["/topic_without_subscriber", new Set(["pub-1", "pub-2"])],
      ]),
      subscribedTopics: new Map([["/topic", new Set(["sub-1"])]]),
    },
  });

  useAsync(async () => {
    await delay(10);
    document.querySelector<HTMLElement>(`[data-testid="set-topic-visibility"] button`)!.click();
    const radioOption = document.querySelector<HTMLElement>(
      `[data-testid="${initialTopicVisibility}"]`,
    );
    if (radioOption) {
      radioOption.click();
      document
        .querySelector<HTMLElement>(`[data-testid="set-topic-visibility"] div button:last-child`)!
        .click();
    }
  }, [initialTopicVisibility]);

  return (
    <PanelSetup fixture={fixture}>
      <TopicGraph />
    </PanelSetup>
  );
}

export const AllTopics: StoryObj = {
  render: () => <TopicsStory topicVisibility="all" />,
};

export const TopicsWithSubscribers: StoryObj = {
  render: () => <TopicsStory topicVisibility="subscribed" />,
};

export const TopicsHidden: StoryObj = {
  render: () => <TopicsStory topicVisibility="none" />,
};

export const ReLayout: StoryObj = {
  render: function Story() {
    const [fixture, setFixture] = useState<Fixture>({
      frame: {},
      topics: [{ name: "/topic", schemaName: "std_msgs/Header" }],
      activeData: {
        publishedTopics: new Map([["/topic", new Set(["pub-1", "pub-2"])]]),
        subscribedTopics: new Map([["/topic", new Set(["sub-1"])]]),
      },
    });

    useEffect(() => {
      const timeOutID = setTimeout(() => {
        setFixture({
          frame: {},
          topics: [{ name: "/topic", schemaName: "std_msgs/Header" }],
          activeData: {
            publishedTopics: new Map([["/topic", new Set(["pub-1", "pub-2"])]]),
            subscribedTopics: new Map([["/topic", new Set(["sub-1", "sub-2"])]]),
          },
        });
      }, 100);

      return () => {
        clearTimeout(timeOutID);
      };
    }, []);

    return (
      <PanelSetup fixture={fixture}>
        <TopicGraph />
      </PanelSetup>
    );
  },

  parameters: {
    chromatic: {
      delay: 200,
    },
  },
};
