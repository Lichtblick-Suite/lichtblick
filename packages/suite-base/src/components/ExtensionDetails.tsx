// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Immutable } from "@lichtblick/suite";
import Stack from "@lichtblick/suite-base/components/Stack";
import TextContent from "@lichtblick/suite-base/components/TextContent";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import { useExtensionCatalog } from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import {
  ExtensionMarketplaceDetail,
  useExtensionMarketplace,
} from "@lichtblick/suite-base/context/ExtensionMarketplaceContext";
import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";
import isDesktopApp from "@lichtblick/suite-base/util/isDesktopApp";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { Button, Link, Tab, Tabs, Typography, Divider } from "@mui/material";
import { useSnackbar } from "notistack";
import { useCallback, useState } from "react";
import { useAsync, useMountedState } from "react-use";
import { makeStyles } from "tss-react/mui";

type Props = {
  installed: boolean;
  extension: Immutable<ExtensionMarketplaceDetail>;
  onClose: () => void;
};

const useStyles = makeStyles()((theme) => ({
  backButton: {
    marginLeft: theme.spacing(-1.5),
    marginBottom: theme.spacing(1),
  },
  installButton: {
    minWidth: 100,
  },
}));

export function ExtensionDetails({ extension, onClose, installed }: Props): React.ReactElement {
  const { classes } = useStyles();
  const [isInstalled, setIsInstalled] = useState(installed);
  const [activeTab, setActiveTab] = useState<number>(0);
  const isMounted = useMountedState();
  const downloadExtension = useExtensionCatalog((state) => state.downloadExtension);
  const installExtension = useExtensionCatalog((state) => state.installExtension);
  const uninstallExtension = useExtensionCatalog((state) => state.uninstallExtension);
  const marketplace = useExtensionMarketplace();
  const { enqueueSnackbar } = useSnackbar();
  const readmeUrl = extension.readme;
  const changelogUrl = extension.changelog;
  const canInstall = extension.foxe != undefined;
  const canUninstall = extension.namespace !== "org";

  const { value: readmeContent } = useAsync(
    async () => (readmeUrl != undefined ? await marketplace.getMarkdown(readmeUrl) : ""),
    [marketplace, readmeUrl],
  );
  const { value: changelogContent } = useAsync(
    async () => (changelogUrl != undefined ? await marketplace.getMarkdown(changelogUrl) : ""),
    [marketplace, changelogUrl],
  );

  const analytics = useAnalytics();

  const install = useCallback(async () => {
    if (!isDesktopApp()) {
      enqueueSnackbar("Download the desktop app to use marketplace extensions.", {
        variant: "error",
      });
      return;
    }

    const url = extension.foxe;
    try {
      if (url == undefined) {
        throw new Error(`Cannot install extension ${extension.id}, "foxe" URL is missing`);
      }
      const data = await downloadExtension(url);
      await installExtension("local", data);
      if (isMounted()) {
        setIsInstalled(true);
        void analytics.logEvent(AppEvent.EXTENSION_INSTALL, { type: extension.id });
      }
    } catch (err) {
      enqueueSnackbar(`Failed to download extension ${extension.id}. ${err.message}`, {
        variant: "error",
      });
    }
  }, [
    analytics,
    downloadExtension,
    enqueueSnackbar,
    extension.foxe,
    extension.id,
    installExtension,
    isMounted,
  ]);

  const uninstall = useCallback(async () => {
    await uninstallExtension(extension.namespace ?? "local", extension.id);
    if (isMounted()) {
      setIsInstalled(false);
      void analytics.logEvent(AppEvent.EXTENSION_UNINSTALL, { type: extension.id });
    }
  }, [analytics, extension.id, extension.namespace, isMounted, uninstallExtension]);

  return (
    <Stack fullHeight flex="auto" gap={1}>
      <div>
        <Button
          className={classes.backButton}
          onClick={onClose}
          size="small"
          startIcon={<ChevronLeftIcon />}
        >
          Back
        </Button>
        <Typography variant="h3" fontWeight={500}>
          {extension.name}
        </Typography>
      </div>

      <Stack gap={1} alignItems="flex-start">
        <Stack gap={0.5} paddingBottom={1}>
          <Stack direction="row" gap={1} alignItems="baseline">
            <Link
              variant="body2"
              color="primary"
              href={extension.homepage}
              target="_blank"
              underline="hover"
            >
              {extension.id}
            </Link>
            <Typography
              variant="caption"
              color="text.secondary"
            >{`v${extension.version}`}</Typography>
            <Typography variant="caption" color="text.secondary">
              {extension.license}
            </Typography>
          </Stack>
          <Typography variant="subtitle2" gutterBottom>
            {extension.publisher}
          </Typography>
          <Typography variant="body2" gutterBottom>
            {extension.description}
          </Typography>
        </Stack>
        {isInstalled && canUninstall ? (
          <Button
            className={classes.installButton}
            size="small"
            key="uninstall"
            color="inherit"
            variant="contained"
            onClick={uninstall}
          >
            Uninstall
          </Button>
        ) : (
          canInstall && (
            <Button
              className={classes.installButton}
              size="small"
              key="install"
              color="inherit"
              variant="contained"
              onClick={install}
            >
              Install
            </Button>
          )
        )}
      </Stack>

      <Stack paddingTop={2} style={{ marginLeft: -16, marginRight: -16 }}>
        <Tabs
          textColor="inherit"
          value={activeTab}
          onChange={(_event, newValue: number) => {
            setActiveTab(newValue);
          }}
        >
          <Tab disableRipple label="README" value={0} />
          <Tab disableRipple label="CHANGELOG" value={1} />
        </Tabs>
        <Divider />
      </Stack>

      <Stack flex="auto" paddingY={2}>
        {activeTab === 0 && <TextContent>{readmeContent}</TextContent>}
        {activeTab === 1 && <TextContent>{changelogContent}</TextContent>}
      </Stack>
    </Stack>
  );
}
