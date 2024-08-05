// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Stack from "@lichtblick/suite-base/components/Stack";
import { Popover, TextField, useTheme } from "@mui/material";
import { useCallback, useState } from "react";
import tinycolor from "tinycolor2";

import { ColorPickerControl, useColorPickerControl } from "./ColorPickerControl";
import { ColorSwatch } from "./ColorSwatch";

export function ColorGradientInput({
  colors,
  disabled = false,
  onChange,
  readOnly = false,
}: {
  colors: undefined | readonly [string, string];
  disabled?: boolean;
  onChange: (colors: [left: string, right: string]) => void;
  readOnly?: boolean;
}): JSX.Element {
  const [leftAnchor, setLeftAnchor] = useState<undefined | HTMLDivElement>(undefined);
  const [rightAnchor, setRightAnchor] = useState<undefined | HTMLDivElement>(undefined);

  const handleLeftClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly) {
        return;
      }

      setLeftAnchor(event.currentTarget);
      setRightAnchor(undefined);
    },
    [readOnly],
  );

  const handleRightClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly) {
        return;
      }

      setLeftAnchor(undefined);
      setRightAnchor(event.currentTarget);
    },
    [readOnly],
  );

  const handleClose = useCallback(() => {
    setLeftAnchor(undefined);
    setRightAnchor(undefined);
  }, []);

  const leftColor = colors?.[0] ?? "#000000";
  const rightColor = colors?.[1] ?? "#FFFFFF";
  const safeLeftColor = tinycolor(leftColor).isValid() ? leftColor : "#000000";
  const safeRightColor = tinycolor(rightColor).isValid() ? rightColor : "#FFFFFF";

  const theme = useTheme();

  const leftSwatch = useColorPickerControl({
    alphaType: "alpha",
    onChange: (newValue) => {
      onChange([newValue, rightColor]);
    },
    value: leftColor,
  });

  const rightSwatch = useColorPickerControl({
    alphaType: "alpha",
    onChange: (newValue) => {
      onChange([leftColor, newValue]);
    },
    value: rightColor,
  });

  return (
    <Stack
      direction="row"
      alignItems="center"
      position="relative"
      paddingX={0.75}
      style={{
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
        background: `linear-gradient(to right, ${safeLeftColor}, ${safeRightColor}), repeating-conic-gradient(transparent 0 90deg, ${theme.palette.action.disabled} 90deg 180deg) top left/10px 10px repeat`,
      }}
    >
      <ColorSwatch color={safeLeftColor} onClick={handleLeftClick} />
      <TextField
        variant="filled"
        size="small"
        fullWidth
        value={`${leftColor} / ${rightColor}`}
        style={{ visibility: "hidden" }}
      />
      <ColorSwatch color={safeRightColor} onClick={handleRightClick} />
      <Popover
        open={leftAnchor != undefined}
        anchorEl={leftAnchor}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <ColorPickerControl onEnterKey={handleClose} {...leftSwatch} />
      </Popover>
      <Popover
        open={rightAnchor != undefined}
        anchorEl={rightAnchor}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <ColorPickerControl onEnterKey={handleClose} {...rightSwatch} />
      </Popover>
    </Stack>
  );
}
