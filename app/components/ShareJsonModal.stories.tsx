//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import TestUtils from "react-dom/test-utils";

import { importPanelLayout } from "@foxglove-studio/app/actions/panels";
import ShareJsonModal from "@foxglove-studio/app/components/ShareJsonModal";
import { ImportPanelLayoutPayload } from "@foxglove-studio/app/types/panels";

const onLayoutChange = (layout: ImportPanelLayoutPayload, isFromUrl: boolean = false) => {
  importPanelLayout(layout);
};

storiesOf("<ShareJsonModal>", module)
  .add("standard", () => (
    <ShareJsonModal
      onRequestClose={() => {
        // no-op
      }}
      value=""
      onChange={() => {
        // no-op
      }}
      noun="layout"
    />
  ))
  .add("submitting invalid layout", () => (
    <div
      data-modalcontainer="true"
      ref={(el) => {
        if (el) {
          const textarea: any = el.querySelector("textarea");
          textarea.value = "{";
          TestUtils.Simulate.change(textarea);
          setTimeout(() => {
            (el as any).querySelector(".test-apply").click();
          }, 10);
        }
      }}
    >
      <ShareJsonModal
        onRequestClose={() => {
          // no-op
        }}
        value={""}
        onChange={onLayoutChange}
        noun="layout"
      />
    </div>
  ));
