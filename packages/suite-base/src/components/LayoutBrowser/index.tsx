// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Logger from "@lichtblick/log";
import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import SignInPrompt from "@lichtblick/suite-base/components/LayoutBrowser/SignInPrompt";
import { useUnsavedChangesPrompt } from "@lichtblick/suite-base/components/LayoutBrowser/UnsavedChangesPrompt";
import { SidebarContent } from "@lichtblick/suite-base/components/SidebarContent";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import {
  LayoutID,
  LayoutState,
  useCurrentLayoutActions,
  useCurrentLayoutSelector,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import { useCurrentUser } from "@lichtblick/suite-base/context/CurrentUserContext";
import { useLayoutManager } from "@lichtblick/suite-base/context/LayoutManagerContext";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks/useAppConfigurationValue";
import useCallbackWithToast from "@lichtblick/suite-base/hooks/useCallbackWithToast";
import { useConfirm } from "@lichtblick/suite-base/hooks/useConfirm";
import { usePrompt } from "@lichtblick/suite-base/hooks/usePrompt";
import { defaultPlaybackConfig } from "@lichtblick/suite-base/providers/CurrentLayoutProvider/reducers";
import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";
import { Layout, layoutIsShared } from "@lichtblick/suite-base/services/ILayoutStorage";
import { downloadTextFile } from "@lichtblick/suite-base/util/download";
import showOpenFilePicker from "@lichtblick/suite-base/util/showOpenFilePicker";
import AddIcon from "@mui/icons-material/Add";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import FileOpenOutlinedIcon from "@mui/icons-material/FileOpenOutlined";
import {
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import * as _ from "lodash-es";
import moment from "moment";
import { useSnackbar } from "notistack";
import path from "path";
import { MouseEvent, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useMountedState } from "react-use";
import useAsyncFn from "react-use/lib/useAsyncFn";
import { makeStyles } from "tss-react/mui";

import LayoutSection from "./LayoutSection";
import { useLayoutBrowserReducer } from "./reducer";

const log = Logger.getLogger(__filename);

const selectedLayoutIdSelector = (state: LayoutState) => state.selectedLayout?.id;

const useStyles = makeStyles()((theme) => ({
  actionList: {
    paddingTop: theme.spacing(1),
  },
}));

export default function LayoutBrowser({
  menuClose,
  currentDateForStorybook,
}: React.PropsWithChildren<{
  menuClose?: () => void;
  currentDateForStorybook?: Date;
}>): JSX.Element {
  const { classes } = useStyles();
  const { signIn } = useCurrentUser();
  const isMounted = useMountedState();
  const { enqueueSnackbar } = useSnackbar();
  const layoutManager = useLayoutManager();
  const [prompt, promptModal] = usePrompt();
  const analytics = useAnalytics();
  const [confirm, confirmModal] = useConfirm();
  const { unsavedChangesPrompt, openUnsavedChangesPrompt } = useUnsavedChangesPrompt();

  const currentLayoutId = useCurrentLayoutSelector(selectedLayoutIdSelector);
  const { setSelectedLayoutId } = useCurrentLayoutActions();

  const [state, dispatch] = useLayoutBrowserReducer({
    lastSelectedId: currentLayoutId,
    busy: layoutManager.isBusy,
    error: layoutManager.error,
    online: layoutManager.isOnline,
  });

  useLayoutEffect(() => {
    const busyListener = () => {
      dispatch({ type: "set-busy", value: layoutManager.isBusy });
    };
    const onlineListener = () => {
      dispatch({ type: "set-online", value: layoutManager.isOnline });
    };
    const errorListener = () => {
      dispatch({ type: "set-error", value: layoutManager.error });
    };
    busyListener();
    onlineListener();
    errorListener();
    layoutManager.on("busychange", busyListener);
    layoutManager.on("onlinechange", onlineListener);
    layoutManager.on("errorchange", errorListener);
    return () => {
      layoutManager.off("busychange", busyListener);
      layoutManager.off("onlinechange", onlineListener);
      layoutManager.off("errorchange", errorListener);
    };
  }, [dispatch, layoutManager]);

  const [layouts, reloadLayouts] = useAsyncFn(
    async () => {
      const [shared, personal] = _.partition(
        await layoutManager.getLayouts(),
        layoutManager.supportsSharing ? layoutIsShared : () => false,
      );
      return {
        personal: personal.sort((a, b) => a.name.localeCompare(b.name)),
        shared: shared.sort((a, b) => a.name.localeCompare(b.name)),
      };
    },
    [layoutManager],
    { loading: true },
  );

  useEffect(() => {
    const processAction = async () => {
      if (!state.multiAction) {
        return;
      }

      const id = state.multiAction.ids[0];
      if (id) {
        try {
          switch (state.multiAction.action) {
            case "delete":
              await layoutManager.deleteLayout({ id: id as LayoutID });
              dispatch({ type: "shift-multi-action" });
              break;
            case "duplicate": {
              const layout = await layoutManager.getLayout(id as LayoutID);
              if (layout) {
                await layoutManager.saveNewLayout({
                  name: `${layout.name} copy`,
                  data: layout.working?.data ?? layout.baseline.data,
                  permission: "CREATOR_WRITE",
                });
              }
              dispatch({ type: "shift-multi-action" });
              break;
            }
            case "revert":
              await layoutManager.revertLayout({ id: id as LayoutID });
              dispatch({ type: "shift-multi-action" });
              break;
            case "save":
              await layoutManager.overwriteLayout({ id: id as LayoutID });
              dispatch({ type: "shift-multi-action" });
              break;
          }
        } catch (err) {
          enqueueSnackbar(`Error processing layouts: ${err.message}`, { variant: "error" });
          dispatch({ type: "clear-multi-action" });
        }
      }
    };

    processAction().catch((err) => {
      log.error(err);
    });
  }, [dispatch, enqueueSnackbar, layoutManager, state.multiAction]);

  useEffect(() => {
    const listener = () => void reloadLayouts();
    layoutManager.on("change", listener);
    return () => {
      layoutManager.off("change", listener);
    };
  }, [layoutManager, reloadLayouts]);

  // Start loading on first mount
  useEffect(() => {
    reloadLayouts().catch((err) => {
      log.error(err);
    });
  }, [reloadLayouts]);

  /**
   * Don't allow the user to switch away from a personal layout if they have unsaved changes. This
   * currently has a race condition because of the throttled save in CurrentLayoutProvider -- it's
   * possible to make changes and switch layouts before they're sent to the layout manager.
   * @returns true if the original action should continue, false otherwise
   */
  const promptForUnsavedChanges = useCallback(async () => {
    const currentLayout =
      currentLayoutId != undefined ? await layoutManager.getLayout(currentLayoutId) : undefined;
    if (
      currentLayout != undefined &&
      layoutIsShared(currentLayout) &&
      currentLayout.working != undefined
    ) {
      const result = await openUnsavedChangesPrompt(currentLayout);
      switch (result.type) {
        case "cancel":
          return false;
        case "discard":
          await layoutManager.revertLayout({ id: currentLayout.id });
          void analytics.logEvent(AppEvent.LAYOUT_REVERT, {
            permission: currentLayout.permission,
            context: "UnsavedChangesPrompt",
          });
          return true;
        case "overwrite":
          await layoutManager.overwriteLayout({ id: currentLayout.id });
          void analytics.logEvent(AppEvent.LAYOUT_OVERWRITE, {
            permission: currentLayout.permission,
            context: "UnsavedChangesPrompt",
          });
          return true;
        case "makePersonal":
          // We don't use onMakePersonalCopy() here because it might need to prompt for unsaved changes, and we don't want to select the newly created layout
          await layoutManager.makePersonalCopy({
            id: currentLayout.id,
            name: result.name,
          });
          void analytics.logEvent(AppEvent.LAYOUT_MAKE_PERSONAL_COPY, {
            permission: currentLayout.permission,
            syncStatus: currentLayout.syncInfo?.status,
            context: "UnsavedChangesPrompt",
          });
          return true;
      }
    }
    return true;
  }, [analytics, currentLayoutId, layoutManager, openUnsavedChangesPrompt]);

  const onSelectLayout = useCallbackWithToast(
    async (
      item: Layout,
      { selectedViaClick = false, event }: { selectedViaClick?: boolean; event?: MouseEvent } = {},
    ) => {
      if (selectedViaClick) {
        if (!(await promptForUnsavedChanges())) {
          return;
        }
        void analytics.logEvent(AppEvent.LAYOUT_SELECT, { permission: item.permission });
      }
      if (event?.ctrlKey === true || event?.metaKey === true || event?.shiftKey === true) {
        if (item.id !== currentLayoutId) {
          dispatch({
            type: "select-id",
            id: item.id,
            layouts: layouts.value,
            modKey: event.ctrlKey || event.metaKey,
            shiftKey: event.shiftKey,
          });
        }
      } else {
        setSelectedLayoutId(item.id);
        dispatch({ type: "select-id", id: item.id });
        menuClose?.();
      }
    },
    [
      analytics,
      currentLayoutId,
      dispatch,
      layouts.value,
      menuClose,
      promptForUnsavedChanges,
      setSelectedLayoutId,
    ],
  );

  const onRenameLayout = useCallbackWithToast(
    async (item: Layout, newName: string) => {
      await layoutManager.updateLayout({ id: item.id, name: newName });
      void analytics.logEvent(AppEvent.LAYOUT_RENAME, { permission: item.permission });
    },
    [analytics, layoutManager],
  );

  const onDuplicateLayout = useCallbackWithToast(
    async (item: Layout) => {
      if (state.selectedIds.length > 1) {
        dispatch({ type: "queue-multi-action", action: "duplicate" });
        return;
      }

      if (!(await promptForUnsavedChanges())) {
        return;
      }
      const newLayout = await layoutManager.saveNewLayout({
        name: `${item.name} copy`,
        data: item.working?.data ?? item.baseline.data,
        permission: "CREATOR_WRITE",
      });
      await onSelectLayout(newLayout);
      void analytics.logEvent(AppEvent.LAYOUT_DUPLICATE, { permission: item.permission });
    },
    [
      analytics,
      dispatch,
      layoutManager,
      onSelectLayout,
      promptForUnsavedChanges,
      state.selectedIds.length,
    ],
  );

  const onDeleteLayout = useCallbackWithToast(
    async (item: Layout) => {
      if (state.selectedIds.length > 1) {
        dispatch({ type: "queue-multi-action", action: "delete" });
        return;
      }

      void analytics.logEvent(AppEvent.LAYOUT_DELETE, { permission: item.permission });

      // If the layout was selected, select a different available layout.
      //
      // When a users current layout is deleted, we display a notice. By selecting a new layout
      // before deleting their current layout we avoid the weirdness of displaying a notice that the
      // user just deleted their current layout which is somewhat obvious to the user.
      if (currentLayoutId === item.id) {
        const storedLayouts = await layoutManager.getLayouts();
        const targetLayout = storedLayouts.find((layout) => layout.id !== currentLayoutId);
        setSelectedLayoutId(targetLayout?.id);
        dispatch({ type: "select-id", id: targetLayout?.id });
      }
      await layoutManager.deleteLayout({ id: item.id });
    },
    [
      analytics,
      currentLayoutId,
      dispatch,
      layoutManager,
      setSelectedLayoutId,
      state.selectedIds.length,
    ],
  );

  const createNewLayout = useCallbackWithToast(async () => {
    if (!(await promptForUnsavedChanges())) {
      return;
    }
    const name = `Unnamed layout ${moment(currentDateForStorybook).format("l")} at ${moment(
      currentDateForStorybook,
    ).format("LT")}`;
    const layoutData: Omit<LayoutData, "name" | "id"> = {
      configById: {},
      globalVariables: {},
      userNodes: {},
      playbackConfig: defaultPlaybackConfig,
    };
    const newLayout = await layoutManager.saveNewLayout({
      name,
      data: layoutData as LayoutData,
      permission: "CREATOR_WRITE",
    });
    void onSelectLayout(newLayout);

    void analytics.logEvent(AppEvent.LAYOUT_CREATE);
  }, [promptForUnsavedChanges, currentDateForStorybook, layoutManager, onSelectLayout, analytics]);

  const onExportLayout = useCallbackWithToast(
    async (item: Layout) => {
      const content = JSON.stringify(item.working?.data ?? item.baseline.data, undefined, 2) ?? "";
      downloadTextFile(content, `${item.name}.json`);
      void analytics.logEvent(AppEvent.LAYOUT_EXPORT, { permission: item.permission });
    },
    [analytics],
  );

  const onShareLayout = useCallbackWithToast(
    async (item: Layout) => {
      const name = await prompt({
        title: "Share a copy with your organization",
        subText: "Shared layouts can be used and changed by other members of your organization.",
        initialValue: item.name,
        label: "Layout name",
      });
      if (name != undefined) {
        const newLayout = await layoutManager.saveNewLayout({
          name,
          data: item.working?.data ?? item.baseline.data,
          permission: "ORG_WRITE",
        });
        void analytics.logEvent(AppEvent.LAYOUT_SHARE, { permission: item.permission });
        await onSelectLayout(newLayout);
      }
    },
    [analytics, layoutManager, onSelectLayout, prompt],
  );

  const onOverwriteLayout = useCallbackWithToast(
    async (item: Layout) => {
      // We don't need to confirm the multiple selection case because we force users to save
      // or abandon changes before selecting another layout with unsaved changes to the current
      // shared layout.
      if (state.selectedIds.length > 1) {
        dispatch({ type: "queue-multi-action", action: "save" });
        return;
      }

      if (layoutIsShared(item)) {
        const response = await confirm({
          title: `Update “${item.name}”?`,
          prompt:
            "Your changes will overwrite this layout for all organization members. This cannot be undone.",
          ok: "Save",
        });
        if (response !== "ok") {
          return;
        }
      }
      await layoutManager.overwriteLayout({ id: item.id });
      void analytics.logEvent(AppEvent.LAYOUT_OVERWRITE, { permission: item.permission });
    },
    [analytics, confirm, dispatch, layoutManager, state.selectedIds.length],
  );

  const onRevertLayout = useCallbackWithToast(
    async (item: Layout) => {
      if (state.selectedIds.length > 1) {
        dispatch({ type: "queue-multi-action", action: "revert" });
        return;
      }

      await layoutManager.revertLayout({ id: item.id });
      void analytics.logEvent(AppEvent.LAYOUT_REVERT, { permission: item.permission });
    },
    [analytics, dispatch, layoutManager, state.selectedIds.length],
  );

  const onMakePersonalCopy = useCallbackWithToast(
    async (item: Layout) => {
      const newLayout = await layoutManager.makePersonalCopy({
        id: item.id,
        name: `${item.name} copy`,
      });
      await onSelectLayout(newLayout);
      void analytics.logEvent(AppEvent.LAYOUT_MAKE_PERSONAL_COPY, {
        permission: item.permission,
        syncStatus: item.syncInfo?.status,
      });
    },
    [analytics, layoutManager, onSelectLayout],
  );

  const importLayout = useCallbackWithToast(async () => {
    if (!(await promptForUnsavedChanges())) {
      return;
    }
    const fileHandles = await showOpenFilePicker({
      multiple: true,
      excludeAcceptAllOption: false,
      types: [
        {
          description: "JSON Files",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
    });
    if (fileHandles.length === 0) {
      return;
    }

    const newLayouts = await Promise.all(
      fileHandles.map(async (fileHandle) => {
        const file = await fileHandle.getFile();
        const layoutName = path.basename(file.name, path.extname(file.name));
        const content = await file.text();

        if (!isMounted()) {
          return;
        }

        let parsedState: unknown;
        try {
          parsedState = JSON.parse(content);
        } catch (err) {
          enqueueSnackbar(`${file.name} is not a valid layout: ${err.message}`, {
            variant: "error",
          });
          return;
        }

        if (typeof parsedState !== "object" || !parsedState) {
          enqueueSnackbar(`${file.name} is not a valid layout`, { variant: "error" });
          return;
        }

        const data = parsedState as LayoutData;
        const newLayout = await layoutManager.saveNewLayout({
          name: layoutName,
          data,
          permission: "CREATOR_WRITE",
        });
        return newLayout;
      }),
    );

    if (!isMounted()) {
      return;
    }
    const newLayout = newLayouts.find((layout) => layout != undefined);
    if (newLayout) {
      void onSelectLayout(newLayout);
    }
    void analytics.logEvent(AppEvent.LAYOUT_IMPORT, { numLayouts: fileHandles.length });
  }, [
    analytics,
    enqueueSnackbar,
    isMounted,
    layoutManager,
    onSelectLayout,
    promptForUnsavedChanges,
  ]);

  const [enableNewTopNav = true] = useAppConfigurationValue<boolean>(AppSetting.ENABLE_NEW_TOPNAV);
  const [hideSignInPrompt = false, setHideSignInPrompt] = useAppConfigurationValue<boolean>(
    AppSetting.HIDE_SIGN_IN_PROMPT,
  );
  const showSignInPrompt =
    signIn != undefined && !layoutManager.supportsSharing && !hideSignInPrompt;

  const pendingMultiAction = state.multiAction?.ids != undefined;

  const anySelectedModifiedLayouts = useMemo(() => {
    return [layouts.value?.personal ?? [], layouts.value?.shared ?? []]
      .flat()
      .some((layout) => layout.working != undefined && state.selectedIds.includes(layout.id));
  }, [layouts, state.selectedIds]);

  return (
    <SidebarContent
      title="Layouts"
      disablePadding
      disableToolbar={enableNewTopNav}
      trailingItems={[
        (layouts.loading || state.busy || pendingMultiAction) && (
          <Stack key="loading" alignItems="center" justifyContent="center" padding={1}>
            <CircularProgress size={18} variant="indeterminate" />
          </Stack>
        ),
        (!state.online || state.error != undefined) && (
          <IconButton color="primary" key="offline" disabled title="Offline">
            <CloudOffIcon />
          </IconButton>
        ),
        <IconButton
          color="primary"
          key="add-layout"
          onClick={createNewLayout}
          aria-label="Create new layout"
          data-testid="add-layout"
          title="Create new layout"
        >
          <AddIcon />
        </IconButton>,
        <IconButton
          color="primary"
          key="import-layout"
          onClick={importLayout}
          aria-label="Import layout"
          title="Import layout"
        >
          <FileOpenOutlinedIcon />
        </IconButton>,
      ].filter(Boolean)}
    >
      {promptModal}
      {confirmModal}
      {unsavedChangesPrompt}
      <Stack
        fullHeight
        gap={enableNewTopNav ? 1 : 2}
        style={{ pointerEvents: pendingMultiAction ? "none" : "auto" }}
      >
        {enableNewTopNav && (
          <>
            <List className={classes.actionList} disablePadding>
              <ListItem disablePadding>
                <ListItemButton onClick={createNewLayout}>
                  <ListItemText disableTypography>Create new layout</ListItemText>
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={importLayout}>
                  <ListItemText disableTypography>Import from file…</ListItemText>
                </ListItemButton>
              </ListItem>
            </List>
            <Divider variant="middle" />
          </>
        )}
        <LayoutSection
          disablePadding={enableNewTopNav}
          title={layoutManager.supportsSharing ? "Personal" : undefined}
          emptyText="Add a new layout to get started with Lichtblick!"
          items={layouts.value?.personal}
          anySelectedModifiedLayouts={anySelectedModifiedLayouts}
          multiSelectedIds={state.selectedIds}
          selectedId={currentLayoutId}
          onSelect={onSelectLayout}
          onRename={onRenameLayout}
          onDuplicate={onDuplicateLayout}
          onDelete={onDeleteLayout}
          onShare={onShareLayout}
          onExport={onExportLayout}
          onOverwrite={onOverwriteLayout}
          onRevert={onRevertLayout}
          onMakePersonalCopy={onMakePersonalCopy}
        />
        {layoutManager.supportsSharing && (
          <LayoutSection
            disablePadding={enableNewTopNav}
            title="Organization"
            emptyText="Your organization doesn’t have any shared layouts yet. Share a layout to collaborate with others."
            items={layouts.value?.shared}
            anySelectedModifiedLayouts={anySelectedModifiedLayouts}
            multiSelectedIds={state.selectedIds}
            selectedId={currentLayoutId}
            onSelect={onSelectLayout}
            onRename={onRenameLayout}
            onDuplicate={onDuplicateLayout}
            onDelete={onDeleteLayout}
            onShare={onShareLayout}
            onExport={onExportLayout}
            onOverwrite={onOverwriteLayout}
            onRevert={onRevertLayout}
            onMakePersonalCopy={onMakePersonalCopy}
          />
        )}
        {!enableNewTopNav && <Stack flexGrow={1} />}
        {showSignInPrompt && <SignInPrompt onDismiss={() => void setHideSignInPrompt(true)} />}
      </Stack>
    </SidebarContent>
  );
}
