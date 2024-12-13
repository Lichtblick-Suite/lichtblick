// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import { IconButton, TextField, InputAdornment } from "@mui/material";
import { TextFieldProps } from "@mui/material/TextField";
import { PropsWithChildren } from "react";

import { useStyles } from "@lichtblick/suite-base/components/SearchBar.style";

function SearchBar(
  props: PropsWithChildren<
    TextFieldProps & {
      onClear?: () => void;
      showClearIcon?: boolean;
      startAdornment?: React.ReactNode;
    }
  >,
): React.JSX.Element {
  const {
    id = "search-bar",
    variant = "filled",
    disabled = false,
    value,
    onChange,
    onClear,
    showClearIcon = false,
    startAdornment = <SearchIcon fontSize="small" />,
    ...rest
  } = props;

  const { classes } = useStyles();

  return (
    <header className={classes.filterSearchBar}>
      <TextField
        id={id}
        variant={variant}
        disabled={disabled}
        value={value}
        onChange={onChange}
        fullWidth
        InputProps={{
          ...rest.InputProps,
          startAdornment: (
            <InputAdornment className={classes.filterStartAdornment} position="start">
              {startAdornment}
            </InputAdornment>
          ),
          endAdornment: showClearIcon && (
            <InputAdornment position="end">
              <IconButton size="small" title="Clear" onClick={onClear} edge="end">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        {...rest}
      />
    </header>
  );
}

export default SearchBar;
