// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/* eslint-disable @foxglove/no-restricted-imports */

import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import { EventsList } from "@lichtblick/suite-base/components/EventsList";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import { SidebarContent } from "@lichtblick/suite-base/components/SidebarContent";
import Stack from "@lichtblick/suite-base/components/Stack";
import { TopicList } from "@lichtblick/suite-base/components/TopicList";
import WssErrorModal from "@lichtblick/suite-base/components/WssErrorModal";
import { useCurrentUser } from "@lichtblick/suite-base/context/CurrentUserContext";
import { EventsStore, useEvents } from "@lichtblick/suite-base/context/EventsContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks/useAppConfigurationValue";
import { PlayerPresence } from "@lichtblick/suite-base/players/types";
import AddIcon from "@mui/icons-material/Add";
import {
  CircularProgress,
  Divider,
  IconButton,
  Tab,
  Tabs,
  styled as muiStyled,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { makeStyles } from "tss-react/mui";

import { DataSourceInfoView } from "../DataSourceInfoView";
import { ProblemsList } from "../ProblemsList";

type Props = {
  disableToolbar?: boolean;
};

const useStyles = makeStyles()({
  tabContent: {
    flex: "auto",
  },
});

const StyledTab = muiStyled(Tab)(({ theme }) => ({
  minHeight: 30,
  minWidth: theme.spacing(8),
  padding: theme.spacing(0, 1.5),
  color: theme.palette.text.secondary,
  fontSize: "0.6875rem",

  "&.Mui-selected": {
    color: theme.palette.text.primary,
  },
}));

const StyledTabs = muiStyled(Tabs)({
  minHeight: "auto",

  ".MuiTabs-indicator": {
    transform: "scaleX(0.5)",
    height: 2,
  },
});

const ProblemCount = muiStyled("div")(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  fontSize: theme.typography.caption.fontSize,
  color: theme.palette.error.contrastText,
  padding: theme.spacing(0.125, 0.75),
  borderRadius: 8,
}));

const selectPlayerPresence = ({ playerState }: MessagePipelineContext) => playerState.presence;
const selectPlayerProblems = ({ playerState }: MessagePipelineContext) => playerState.problems;
const selectSelectedEventId = (store: EventsStore) => store.selectedEventId;
const selectEventsSupported = (store: EventsStore) => store.eventsSupported;

type DataSourceSidebarTab = "topics" | "events" | "problems";

export default function DataSourceSidebar(props: Props): JSX.Element {
  const { disableToolbar = false } = props;
  const playerPresence = useMessagePipeline(selectPlayerPresence);
  const playerProblems = useMessagePipeline(selectPlayerProblems) ?? [];
  const { currentUser } = useCurrentUser();
  const selectedEventId = useEvents(selectSelectedEventId);
  const [activeTab, setActiveTab] = useState<DataSourceSidebarTab>("topics");
  const { classes } = useStyles();
  const { t } = useTranslation("dataSourceInfo");
  const { dialogActions } = useWorkspaceActions();

  const [enableNewTopNav = true] = useAppConfigurationValue<boolean>(AppSetting.ENABLE_NEW_TOPNAV);

  const eventsSupported = useEvents(selectEventsSupported);
  const showEventsTab = !enableNewTopNav && currentUser != undefined && eventsSupported;

  const isLoading = useMemo(
    () =>
      playerPresence === PlayerPresence.INITIALIZING ||
      playerPresence === PlayerPresence.RECONNECTING,
    [playerPresence],
  );

  useEffect(() => {
    if (playerPresence === PlayerPresence.ERROR || playerPresence === PlayerPresence.RECONNECTING) {
      setActiveTab("problems");
    } else if (showEventsTab && selectedEventId != undefined) {
      setActiveTab("events");
    }
  }, [playerPresence, showEventsTab, selectedEventId]);

  return (
    <SidebarContent
      disablePadding
      disableToolbar={disableToolbar}
      overflow="auto"
      title={t("dataSource")}
      trailingItems={[
        isLoading && (
          <Stack key="loading" alignItems="center" justifyContent="center" padding={1}>
            <CircularProgress size={18} variant="indeterminate" />
          </Stack>
        ),
        <IconButton
          key="add-connection"
          color="primary"
          title="New connection"
          onClick={() => {
            dialogActions.dataSource.open("start");
          }}
        >
          <AddIcon />
        </IconButton>,
      ].filter(Boolean)}
    >
      <Stack fullHeight>
        {!disableToolbar && (
          <Stack paddingX={2} paddingBottom={2}>
            <DataSourceInfoView />
          </Stack>
        )}
        {playerPresence !== PlayerPresence.NOT_PRESENT && (
          <>
            <Stack flex={1}>
              {!disableToolbar && (
                <>
                  <StyledTabs
                    value={activeTab}
                    onChange={(_ev, newValue: DataSourceSidebarTab) => {
                      setActiveTab(newValue);
                    }}
                    textColor="inherit"
                  >
                    <StyledTab disableRipple label="Topics" value="topics" />
                    {showEventsTab && <StyledTab disableRipple label="Events" value="events" />}
                    <StyledTab
                      disableRipple
                      label={
                        <Stack direction="row" alignItems="baseline" gap={1}>
                          Problems
                          {playerProblems.length > 0 && (
                            <ProblemCount>{playerProblems.length}</ProblemCount>
                          )}
                        </Stack>
                      }
                      value="problems"
                    />
                  </StyledTabs>
                  <Divider />
                </>
              )}
              {activeTab === "topics" && (
                <div className={classes.tabContent}>
                  <TopicList />
                </div>
              )}
              {activeTab === "events" && (
                <div className={classes.tabContent}>
                  <EventsList />
                </div>
              )}
              {activeTab === "problems" && (
                <div className={classes.tabContent}>
                  <ProblemsList />
                </div>
              )}
            </Stack>
          </>
        )}
      </Stack>
      <WssErrorModal playerProblems={playerProblems} />
    </SidebarContent>
  );
}
