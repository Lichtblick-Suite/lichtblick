// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Log from "@lichtblick/log";
import { Immutable } from "@lichtblick/suite";
import { ExtensionDetails } from "@lichtblick/suite-base/components/ExtensionDetails";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useExtensionCatalog } from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import {
  ExtensionMarketplaceDetail,
  useExtensionMarketplace,
} from "@lichtblick/suite-base/context/ExtensionMarketplaceContext";
import {
  Alert,
  AlertTitle,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import * as _ from "lodash-es";
import { useEffect, useMemo, useState } from "react";
import { useAsyncFn } from "react-use";
import { makeStyles } from "tss-react/mui";

const log = Log.getLogger(__filename);

const useStyles = makeStyles()((theme) => ({
  listItemButton: {
    "&:hover": { color: theme.palette.primary.main },
  },
}));

function displayNameForNamespace(namespace: string): string {
  switch (namespace) {
    case "org":
      return "Organization";
    default:
      return namespace;
  }
}

function ExtensionListEntry(props: {
  entry: Immutable<ExtensionMarketplaceDetail>;
  onClick: () => void;
}): JSX.Element {
  const {
    entry: { id, description, name, publisher, version },
    onClick,
  } = props;
  const { classes } = useStyles();
  return (
    <ListItem disablePadding key={id}>
      <ListItemButton className={classes.listItemButton} onClick={onClick}>
        <ListItemText
          disableTypography
          primary={
            <Stack direction="row" alignItems="baseline" gap={0.5}>
              <Typography variant="subtitle2" fontWeight={600}>
                {name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {version}
              </Typography>
            </Stack>
          }
          secondary={
            <Stack gap={0.5}>
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
              <Typography color="text.primary" variant="body2">
                {publisher}
              </Typography>
            </Stack>
          }
        />
      </ListItemButton>
    </ListItem>
  );
}

export default function ExtensionsSettings(): React.ReactElement {
  const [focusedExtension, setFocusedExtension] = useState<
    | {
        installed: boolean;
        entry: Immutable<ExtensionMarketplaceDetail>;
      }
    | undefined
  >(undefined);
  const installed = useExtensionCatalog((state) => state.installedExtensions);
  const marketplace = useExtensionMarketplace();

  const [marketplaceEntries, refreshMarketplaceEntries] = useAsyncFn(
    async () => await marketplace.getAvailableExtensions(),
    [marketplace],
  );

  const marketplaceMap = useMemo(
    () => _.keyBy(marketplaceEntries.value ?? [], (entry) => entry.id),
    [marketplaceEntries],
  );

  const installedEntries = useMemo(
    () =>
      (installed ?? []).map((entry) => {
        const marketplaceEntry = marketplaceMap[entry.id];
        if (marketplaceEntry != undefined) {
          return { ...marketplaceEntry, namespace: entry.namespace };
        }

        return {
          id: entry.id,
          installed: true,
          name: entry.displayName,
          displayName: entry.displayName,
          description: entry.description,
          publisher: entry.publisher,
          homepage: entry.homepage,
          license: entry.license,
          version: entry.version,
          keywords: entry.keywords,
          namespace: entry.namespace,
          qualifiedName: entry.qualifiedName,
        };
      }),
    [installed, marketplaceMap],
  );

  const namespacedEntries = useMemo(
    () => _.groupBy(installedEntries, (entry) => entry.namespace),
    [installedEntries],
  );

  // Hide installed extensions from the list of available extensions
  const filteredMarketplaceEntries = useMemo(
    () =>
      _.differenceWith(
        marketplaceEntries.value ?? [],
        installed ?? [],
        (a, b) => a.id === b.id && a.namespace === b.namespace,
      ),
    [marketplaceEntries, installed],
  );

  useEffect(() => {
    refreshMarketplaceEntries().catch((error) => {
      log.error(error);
    });
  }, [refreshMarketplaceEntries]);

  if (focusedExtension != undefined) {
    return (
      <ExtensionDetails
        installed={focusedExtension.installed}
        extension={focusedExtension.entry}
        onClose={() => {
          setFocusedExtension(undefined);
        }}
      />
    );
  }

  return (
    <Stack gap={1}>
      {marketplaceEntries.error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={async () => await refreshMarketplaceEntries()}>
              Retry
            </Button>
          }
        >
          <AlertTitle>Failed to retrieve the list of available marketplace extensions</AlertTitle>
          Check your internet connection and try again.
        </Alert>
      )}
      {!_.isEmpty(namespacedEntries) ? (
        Object.entries(namespacedEntries).map(([namespace, entries]) => (
          <List key={namespace}>
            <Stack paddingY={0.25} paddingX={2}>
              <Typography component="li" variant="overline" color="text.secondary">
                {displayNameForNamespace(namespace)}
              </Typography>
            </Stack>
            {entries.map((entry) => (
              <ExtensionListEntry
                key={`${entry.id}`}
                entry={entry}
                onClick={() => {
                  setFocusedExtension({ installed: true, entry });
                }}
              />
            ))}
          </List>
        ))
      ) : (
        <List>
          <ListItem>
            <ListItemText primary="No installed extensions" />
          </ListItem>
        </List>
      )}
      <List>
        <Stack paddingY={0.25} paddingX={2}>
          <Typography component="li" variant="overline" color="text.secondary">
            Available
          </Typography>
        </Stack>
        {filteredMarketplaceEntries.map((entry) => (
          <ExtensionListEntry
            key={`${entry.id}_${entry.namespace}`}
            entry={entry}
            onClick={() => {
              setFocusedExtension({ installed: false, entry });
            }}
          />
        ))}
      </List>
    </Stack>
  );
}
