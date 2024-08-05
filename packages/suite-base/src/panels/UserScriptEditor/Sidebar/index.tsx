// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  DocumentOnePageSparkle24Regular,
  Script24Regular,
  Toolbox24Regular,
} from "@fluentui/react-icons";
import Stack from "@lichtblick/suite-base/components/Stack";
import { Script } from "@lichtblick/suite-base/panels/UserScriptEditor/script";
import { UserScript, UserScripts } from "@lichtblick/suite-base/types/panels";
import { Divider, Paper, Tab, Tabs, tabClasses, tabsClasses } from "@mui/material";
import * as monacoApi from "monaco-editor/esm/vs/editor/editor.api";
import { SyntheticEvent, useCallback, useMemo, useState } from "react";
import tc from "tinycolor2";
import { makeStyles } from "tss-react/mui";

import { ScriptsList } from "./ScriptsList";
import { Templates } from "./Templates";
import { Utilities } from "./Utilities";

const useStyles = makeStyles()((theme) => ({
  tabs: {
    padding: theme.spacing(0.75),

    [`.${tabClasses.root}`]: {
      minWidth: "auto",
      minHeight: 44,
      padding: theme.spacing(1, 1.25),
    },
    [`.${tabsClasses.indicator}`]: {
      backgroundColor: tc(theme.palette.primary.main)
        .setAlpha(theme.palette.action.selectedOpacity)
        .toString(),
      right: 0,
      width: "100%",
      borderRadius: theme.shape.borderRadius,
      transition: "none",
      pointerEvents: "none",
    },
  },
  explorerWrapper: {
    backgroundColor: theme.palette.background.paper,
    width: 350,
    overflow: "auto",
  },
}));

type TabOption =
  | false // false means no tab is selected
  | "nodes"
  | "utils"
  | "templates";

type SidebarProps = {
  addNewScript: (sourceCode?: string) => void;
  selectScript: (scriptId: string) => void;
  deleteScript: (scriptId: string) => void;
  setScriptOverride: (script: Script, maxDepth?: number) => void;
  setUserScripts: (scripts: Partial<UserScripts>) => void;
  userScripts: UserScripts;
  selectedScriptId?: string;
  selectedScript?: UserScript;
  script?: Script;
};

export function Sidebar({
  userScripts,
  selectScript,
  deleteScript,
  selectedScriptId,
  selectedScript,
  setScriptOverride,
  setUserScripts,
  script,
  addNewScript: addNewNode,
}: SidebarProps): JSX.Element {
  const { classes } = useStyles();
  const [activeTab, setActiveTab] = useState<TabOption>(false);

  const gotoUtils = useCallback(
    (filePath: string) => {
      const monacoFilePath = monacoApi.Uri.parse(`file://${filePath}`);
      const requestedModel = monacoApi.editor.getModel(monacoFilePath);
      if (!requestedModel) {
        return;
      }
      setScriptOverride(
        {
          filePath: requestedModel.uri.path,
          code: requestedModel.getValue(),
          readOnly: true,
          selection: undefined,
        },
        2,
      );
    },
    [setScriptOverride],
  );

  const handleClose = () => {
    setActiveTab(false);
  };

  const handleTabSelection = useCallback(
    (_event: SyntheticEvent, newValue: TabOption) => {
      if (activeTab === newValue) {
        setActiveTab(false);
        return;
      }
      setActiveTab(newValue);
    },
    [activeTab],
  );

  const tabPanels = useMemo(
    () => ({
      nodes: (
        <ScriptsList
          scripts={userScripts}
          selectScript={selectScript}
          deleteScript={deleteScript}
          addNewScript={addNewNode}
          onClose={handleClose}
          selectedScriptId={selectedScriptId}
          selectedScript={selectedScript}
          setUserScripts={setUserScripts}
        />
      ),
      utils: <Utilities onClose={handleClose} gotoUtils={gotoUtils} script={script} />,
      templates: <Templates onClose={handleClose} addNewNode={addNewNode} />,
    }),
    [
      addNewNode,
      deleteScript,
      gotoUtils,
      script,
      selectScript,
      selectedScript,
      selectedScriptId,
      setUserScripts,
      userScripts,
    ],
  );

  return (
    <Paper elevation={0}>
      <Stack direction="row" fullHeight>
        <Tabs
          className={classes.tabs}
          orientation="vertical"
          value={activeTab}
          onChange={handleTabSelection}
        >
          <Tab
            disableRipple
            value="nodes"
            title={`Scripts (${Object.keys(userScripts).length})`}
            icon={<Script24Regular />}
            data-testid="node-explorer"
            onClick={activeTab === "nodes" ? handleClose : undefined}
          />
          <Tab
            disableRipple
            value="utils"
            title="Utilities"
            icon={<Toolbox24Regular />}
            data-testid="utils-explorer"
            onClick={activeTab === "utils" ? handleClose : undefined}
          />
          <Tab
            disableRipple
            value="templates"
            title="Templates"
            icon={<DocumentOnePageSparkle24Regular />}
            data-testid="templates-explorer"
            onClick={activeTab === "templates" ? handleClose : undefined}
          />
        </Tabs>
        {activeTab !== false && (
          <>
            <Divider flexItem orientation="vertical" />
            <div className={classes.explorerWrapper}>{tabPanels[activeTab]}</div>
          </>
        )}
        <Divider flexItem orientation="vertical" />
      </Stack>
    </Paper>
  );
}
