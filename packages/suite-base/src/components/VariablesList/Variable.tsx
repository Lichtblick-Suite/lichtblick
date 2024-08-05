// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { VariableValue } from "@lichtblick/suite";
import CopyButton from "@lichtblick/suite-base/components/CopyButton";
import JsonInput from "@lichtblick/suite-base/components/JsonInput";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import useGlobalVariables, {
  GlobalVariables,
} from "@lichtblick/suite-base/hooks/useGlobalVariables";
import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ErrorIcon from "@mui/icons-material/Error";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ListItem,
  ListItemButton,
  ListItemButtonProps,
  ListItemText,
  Typography,
  Tooltip,
  InputBase,
} from "@mui/material";
import * as _ from "lodash-es";
import { useMemo, useCallback, useState, useRef } from "react";
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles<void, "copyButton">()((theme, _params, classes) => ({
  root: {
    "@media (pointer: fine)": {
      [`&:not(:hover) .${classes.copyButton}`]: {
        visibility: "hidden",
      },
    },
  },
  copyButton: {
    top: 0,
    right: 0,
    zIndex: theme.zIndex.mobileStepper,

    "&.MuiButton-root": {
      position: "absolute",
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
      margin: theme.spacing(0.75),
      minWidth: "auto",
    },
  },
  input: {
    font: "inherit",
    flex: "auto",

    ".MuiInputBase-input": {
      padding: 0,
    },
    "&.Mui-error": {
      color: theme.palette.error.main,
    },
  },
  edgeEnd: {
    marginRight: theme.spacing(-1.625),
  },
  editorWrapper: {
    position: "relative",
    backgroundColor: theme.palette.grey[50],
  },
  listItemButton: {
    "&:focus-within": {
      backgroundColor: "transparent",
    },
    "&.Mui-selected": {
      color: theme.palette.primary.main,
      transition: `background-color 300ms ease-in-out`,
    },
  },
  listItemText: {
    marginTop: theme.spacing(0.125),
    marginBottom: theme.spacing(0.125),
  },
}));

const changeGlobalKey = (
  newKey: string,
  oldKey: string,
  globalVariables: GlobalVariables,
  idx: number,
  overwriteGlobalVariables: (_: GlobalVariables) => void,
) => {
  const keys = Object.keys(globalVariables);
  overwriteGlobalVariables({
    ..._.pick(globalVariables, keys.slice(0, idx)),
    [newKey]: globalVariables[oldKey],
    ..._.pick(globalVariables, keys.slice(idx + 1)),
  });
};

export default function Variable(props: {
  name: string;
  selected?: ListItemButtonProps["selected"];
  index: number;
}): JSX.Element {
  const { name, selected = false, index } = props;

  const { classes } = useStyles();

  // When editing the variable name, the new name might collide with an existing variable name
  // If the name matches an existing name, we set the edited name and show an error to the user
  // indicating there is a name conflict. The user must resolve the name conflict or their edited
  // name will be reset on blur.
  const [editedName, setEditedName] = useState<string | undefined>();

  const [expanded, setExpanded] = useState<boolean>(true);
  const [anchorEl, setAnchorEl] = React.useState<undefined | HTMLElement>(undefined);
  const [copied, setCopied] = useState(false);
  const menuOpen = Boolean(anchorEl);

  const { globalVariables, setGlobalVariables, overwriteGlobalVariables } = useGlobalVariables();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(undefined);
  };

  const analytics = useAnalytics();

  const deleteVariable = useCallback(() => {
    setGlobalVariables({ [name]: undefined });
    void analytics.logEvent(AppEvent.VARIABLE_DELETE);
    handleClose();
  }, [analytics, name, setGlobalVariables]);

  const value = useMemo(() => globalVariables[name], [globalVariables, name]);

  const onChangeValue = useCallback(
    (newVal: unknown) => {
      setGlobalVariables({ [name]: newVal as VariableValue });
      setCopied(false);
    },
    [name, setGlobalVariables],
  );

  const onBlur = () => {
    if (
      editedName != undefined &&
      globalVariables[editedName] == undefined &&
      name !== editedName
    ) {
      changeGlobalKey(editedName, name, globalVariables, index, overwriteGlobalVariables);
    }
    setEditedName(undefined);
  };

  const rootRef = useRef<HTMLDivElement>(ReactNull);

  const activeElementIsChild = rootRef.current?.contains(document.activeElement) === true;

  const isSelected = selected && !activeElementIsChild;
  const isDuplicate =
    editedName != undefined && editedName !== name && globalVariables[editedName] != undefined;

  const getText = useCallback(() => JSON.stringify(value, undefined, 2) ?? "", [value]);

  return (
    <Stack className={classes.root} ref={rootRef}>
      <ListItem
        dense
        disablePadding
        secondaryAction={
          <Stack className={classes.edgeEnd} direction="row" alignItems="center" gap={0.25}>
            <IconButton
              size="small"
              id="variable-action-button"
              data-testid="variable-action-button"
              aria-controls={expanded ? "variable-action-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={expanded ? "true" : undefined}
              onClick={handleClick}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              id="variable-action-menu"
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleClose}
              MenuListProps={{
                "aria-labelledby": "variable-action-button",
                dense: true,
              }}
            >
              <MenuItem onClick={deleteVariable}>
                <Typography color="error.main" variant="inherit">
                  Delete variable
                </Typography>
              </MenuItem>
            </Menu>
          </Stack>
        }
      >
        <ListItemButton
          className={classes.listItemButton}
          selected={isSelected}
          onClick={() => {
            setExpanded(!expanded);
          }}
        >
          <ListItemText
            className={classes.listItemText}
            primary={
              <Stack direction="row" alignItems="center" style={{ marginLeft: -12 }}>
                <ArrowDropDownIcon
                  style={{ transform: !expanded ? "rotate(-90deg)" : undefined }}
                />
                <InputBase
                  className={classes.input}
                  autoFocus={name === ""}
                  error={isDuplicate}
                  value={editedName ?? name}
                  placeholder="variable_name"
                  data-testid={`global-variable-key-input-${name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onFocus={() => {
                    if (editedName === "") {
                      setExpanded(true);
                    }
                  }}
                  onChange={(event) => {
                    setEditedName(event.target.value);
                  }}
                  onBlur={onBlur}
                  endAdornment={
                    isDuplicate && (
                      <Tooltip
                        arrow
                        title="A variable with this name already exists. Please select a unique variable name to save changes."
                      >
                        <ErrorIcon className={classes.edgeEnd} fontSize="small" color="error" />
                      </Tooltip>
                    )
                  }
                />
              </Stack>
            }
            primaryTypographyProps={{
              component: "div",
              fontWeight: 600,
              variant: "body2",
            }}
          />
        </ListItemButton>
      </ListItem>
      {expanded && (
        <div className={classes.editorWrapper}>
          <Divider />
          <CopyButton
            className={classes.copyButton}
            size="small"
            color={copied ? "primary" : "inherit"}
            getText={getText}
          >
            {copied ? "Copied" : "Copy"}
          </CopyButton>
          <JsonInput value={value} onChange={onChangeValue} />
        </div>
      )}
      <Divider />
    </Stack>
  );
}
