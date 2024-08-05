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

import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks/useAppConfigurationValue";
import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";
import { Checkbox, FormControlLabel, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()({
  checkbox: {
    paddingTop: 0,
  },
  formControlLabel: {
    alignItems: "start",
  },
});

type Feature = {
  key: AppSetting;
  name: string;
  description: JSX.Element;
};

function useFeatures(): Feature[] {
  const { t } = useTranslation("appSettings");

  const features: Feature[] = [
    {
      key: AppSetting.ENABLE_UNIFIED_NAVIGATION,
      name: t("newAppMenu"),
      description: <>{t("newAppMenuDescription")}</>,
    },
  ];

  if (process.env.NODE_ENV === "development") {
    features.push({
      key: AppSetting.ENABLE_LAYOUT_DEBUGGING,
      name: t("layoutDebugging"),
      description: <>{t("layoutDebuggingDescription")}</>,
    });
  }

  return features;
}

function ExperimentalFeatureItem(props: { feature: Feature }) {
  const { feature } = props;
  const { classes } = useStyles();
  const analytics = useAnalytics();

  const [enabled, setEnabled] = useAppConfigurationValue<boolean>(feature.key);
  return (
    <FormControlLabel
      className={classes.formControlLabel}
      control={
        <Checkbox
          className={classes.checkbox}
          checked={enabled ?? false}
          onChange={(_, checked) => {
            void setEnabled(checked);
            void analytics.logEvent(AppEvent.EXPERIMENTAL_FEATURE_TOGGLE, {
              feature: feature.key,
              checked,
            });
          }}
        />
      }
      label={
        <Stack gap={0.25} paddingLeft={0.5}>
          <Typography fontWeight={600}>{feature.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {feature.description}
          </Typography>
        </Stack>
      }
    />
  );
}

export const ExperimentalFeatureSettings = (): React.ReactElement => {
  const features = useFeatures();
  const { t } = useTranslation("appSettings");
  return (
    <Stack gap={2}>
      {features.length === 0 && (
        <Typography fontStyle="italic">{t("noExperimentalFeatures")}</Typography>
      )}
      {features.map((feature) => (
        <ExperimentalFeatureItem key={feature.key} feature={feature} />
      ))}
    </Stack>
  );
};
