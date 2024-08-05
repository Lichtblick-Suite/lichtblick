// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Logger from "@lichtblick/log";
import BlockheadFilledIcon from "@lichtblick/suite-base/components/BlockheadFilledIcon";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useCurrentUser, User } from "@lichtblick/suite-base/context/CurrentUserContext";
import { useConfirm } from "@lichtblick/suite-base/hooks/useConfirm";
import { Button, CircularProgress, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useCallback } from "react";
import { useAsyncFn } from "react-use";
import { makeStyles } from "tss-react/mui";

const log = Logger.getLogger(__filename);

const AVATAR_ICON_SIZE = 42;

const useStyles = makeStyles()((theme) => ({
  icon: {
    color: theme.palette.primary.main,
    fontSize: AVATAR_ICON_SIZE,
  },
}));

export default function AccountInfo(props: { currentUser?: User }): JSX.Element {
  const { signOut } = useCurrentUser();
  const { enqueueSnackbar } = useSnackbar();
  const [confirm, confirmModal] = useConfirm();
  const { classes } = useStyles();

  const [{ loading }, beginSignOut] = useAsyncFn(async () => {
    try {
      await signOut?.();
    } catch (error) {
      log.error(error);
      enqueueSnackbar((error as Error).toString(), { variant: "error" });
    }
  }, [enqueueSnackbar, signOut]);

  const onSignoutClick = useCallback(() => {
    void confirm({
      title: "Are you sure you want to sign out?",
      ok: "Sign out",
    }).then((response) => {
      if (response === "ok") {
        void beginSignOut();
      }
    });
  }, [beginSignOut, confirm]);

  const onSettingsClick = useCallback(() => {
    window.open(process.env.LICHTBLICK_ACCOUNT_PROFILE_URL, "_blank");
  }, []);

  if (!props.currentUser) {
    return <></>;
  }

  return (
    <Stack fullHeight justifyContent="space-between">
      {confirmModal}
      <Stack gap={2}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <BlockheadFilledIcon className={classes.icon} />
          <Stack justifyContent="center">
            <Typography variant="subtitle1">{props.currentUser.email}</Typography>
            <Typography variant="body2" color="text.secondary">
              {props.currentUser.orgDisplayName ?? props.currentUser.orgSlug}
            </Typography>
          </Stack>
        </Stack>
        <Button onClick={onSettingsClick} variant="contained">
          Account settings
        </Button>
      </Stack>
      <Stack gap={1}>
        <Button onClick={onSignoutClick} variant="outlined">
          Sign out&nbsp;{loading && <CircularProgress size={16} />}
        </Button>
      </Stack>
    </Stack>
  );
}
