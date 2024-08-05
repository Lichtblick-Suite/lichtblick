// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { ExtensionDetails } from "@lichtblick/suite-base/components/ExtensionDetails";
import AppConfigurationContext from "@lichtblick/suite-base/context/AppConfigurationContext";
import ExtensionMarketplaceContext, {
  ExtensionMarketplace,
  ExtensionMarketplaceDetail,
} from "@lichtblick/suite-base/context/ExtensionMarketplaceContext";
import ExtensionCatalogProvider from "@lichtblick/suite-base/providers/ExtensionCatalogProvider";
import { ExtensionLoader } from "@lichtblick/suite-base/services/ExtensionLoader";
import { makeMockAppConfiguration } from "@lichtblick/suite-base/util/makeMockAppConfiguration";
import { StoryObj } from "@storybook/react";
import { useState } from "react";

export default {
  title: "components/ExtensionDetails",
  component: ExtensionDetails,
};

const MockExtensionLoader: ExtensionLoader = {
  namespace: "local",
  getExtensions: async () => [],
  loadExtension: async (_id: string) => "",
  installExtension: async (_foxeFileData: Uint8Array) => {
    throw new Error("MockExtensionLoader cannot install extensions");
  },
  uninstallExtension: async (_id: string) => undefined,
};

const MockExtensionMarketplace: ExtensionMarketplace = {
  getAvailableExtensions: async () => [],
  getMarkdown: async (url: string) =>
    `# Markdown
Mock markdown rendering for URL [${url}](${url}).`,
};

const extension: ExtensionMarketplaceDetail = {
  id: "publisher.storyextension",
  name: "Extension Name",
  description: "Extension sample description",
  qualifiedName: "Qualified Extension Name",
  publisher: "Publisher",
  homepage: "https://foxglove.dev/",
  license: "MIT",
  version: "1.2.10",
  readme: "https://foxglove.dev/storyextension/readme",
  changelog: "https://foxglove.dev/storyextension/changelog",
  foxe: "https://foxglove.dev/storyextension/extension.foxe",
  keywords: ["storybook", "testing"],
  time: {
    modified: "2021-05-19T21:37:40.166Z",
    created: "2012-04-17T00:38:04.350Z",
    "0.0.2": "2012-04-17T00:38:05.679Z",
    "2.1.0": "2021-05-19T21:37:38.037Z",
  },
};

export const Details: StoryObj = {
  render: function Story() {
    const [config] = useState(() => makeMockAppConfiguration());

    return (
      <AppConfigurationContext.Provider value={config}>
        <ExtensionCatalogProvider loaders={[MockExtensionLoader]}>
          <ExtensionMarketplaceContext.Provider value={MockExtensionMarketplace}>
            <ExtensionDetails extension={extension} onClose={() => {}} installed={false} />
          </ExtensionMarketplaceContext.Provider>
        </ExtensionCatalogProvider>
      </AppConfigurationContext.Provider>
    );
  },
};
