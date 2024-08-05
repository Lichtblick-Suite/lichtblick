// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { SettingsTreeFields, SettingsTreeNode } from "@lichtblick/suite";
import { BaseSettings } from "@lichtblick/suite-base/panels/ThreeDeeRender/settings";
import { t } from "i18next";
import * as THREE from "three";

import { rgbaGradient, rgbaToLinear, SRGBToLinear, stringToRgba } from "../color";
import { clamp } from "../math";
import type { ColorRGBA } from "../ros";

export type ColorConverter = (output: ColorRGBA, colorValue: number) => void;

const tempColor1 = { r: 0, g: 0, b: 0, a: 0 };
const tempColor2 = { r: 0, g: 0, b: 0, a: 0 };
export const NEEDS_MIN_MAX = ["gradient", "colormap"];

export const colorFieldComputedPrefix = "_auto_";

export interface ColorModeSettings {
  colorMode: "flat" | "gradient" | "colormap" | "rgb" | "rgba" | "rgba-fields";
  flatColor: string;
  colorField?: string;
  gradient: [string, string];
  colorMap: "turbo" | "rainbow";
  explicitAlpha: number;
  minValue?: number;
  maxValue?: number;
}

export function getColorConverter<
  Settings extends ColorModeSettings & {
    readonly colorMode: Exclude<ColorModeSettings["colorMode"], "rgba-fields">;
  },
>(settings: Settings, minValue: number, maxValue: number): ColorConverter {
  switch (settings.colorMode) {
    case "flat": {
      const flatColor = stringToRgba(tempColor1, settings.flatColor);
      rgbaToLinear(flatColor, flatColor);
      return (output: ColorRGBA, _colorValue: number) => {
        output.r = flatColor.r;
        output.g = flatColor.g;
        output.b = flatColor.b;
        output.a = flatColor.a;
      };
    }
    case "gradient": {
      const valueDelta = Math.max(maxValue - minValue, Number.EPSILON);
      const minColor = stringToRgba(tempColor1, settings.gradient[0]);
      const maxColor = stringToRgba(tempColor2, settings.gradient[1]);
      rgbaToLinear(minColor, minColor);
      rgbaToLinear(maxColor, maxColor);
      return (output: ColorRGBA, colorValue: number) => {
        const frac = Math.max(0, Math.min((colorValue - minValue) / valueDelta, 1));
        rgbaGradient(output, minColor, maxColor, frac);
      };
    }
    case "colormap": {
      const valueDelta = Math.max(maxValue - minValue, Number.EPSILON);
      switch (settings.colorMap) {
        case "turbo":
          return (output: ColorRGBA, colorValue: number) => {
            const frac = Math.max(0, Math.min((colorValue - minValue) / valueDelta, 1));
            turboLinearCached(output, frac);
            output.a = settings.explicitAlpha;
          };
        case "rainbow":
          return (output: ColorRGBA, colorValue: number) => {
            const frac = Math.max(0, Math.min((colorValue - minValue) / valueDelta, 1));
            rainbowLinear(output, frac);
            output.a = settings.explicitAlpha;
          };
      }
      throw new Error(`Unrecognized color map: ${settings.colorMap}`);
    }
    case "rgb":
      return (output: ColorRGBA, colorValue: number) => {
        getColorBgra(output, colorValue);
        output.a = settings.explicitAlpha;
      };
    case "rgba":
      return getColorBgra;
  }
}

// 0xaarrggbb
// Matches rviz behavior:
// https://github.com/ros-visualization/rviz/blob/a60b334fd10785a6b74893189fcebbd419d468e4/src/rviz/default_plugin/point_cloud_transformers.cpp#L383-L406
function getColorBgra(output: ColorRGBA, colorValue: number): void {
  const num = colorValue >>> 0;
  output.a = ((num & 0xff000000) >>> 24) / 255;
  output.r = ((num & 0x00ff0000) >>> 16) / 255;
  output.g = ((num & 0x0000ff00) >>> 8) / 255;
  output.b = ((num & 0x000000ff) >>> 0) / 255;
}

// taken from http://docs.ros.org/jade/api/rviz/html/c++/point__cloud__transformers_8cpp_source.html
// line 47
function rainbowLinear(output: ColorRGBA, pct: number): void {
  const h = (1.0 - clamp(pct, 0, 1)) * 5.0 + 1.0;
  const i = Math.floor(h);
  let f = h % 1;
  // if i is even
  if (i % 2 < 1) {
    f = 1.0 - f;
  }
  const n = SRGBToLinear(1.0 - f);
  if (i <= 1) {
    output.r = n;
    output.g = 0;
    output.b = 1;
  } else if (i === 2) {
    output.r = 0;
    output.g = n;
    output.b = 1;
  } else if (i === 3) {
    output.r = 0;
    output.g = 1;
    output.b = n;
  } else if (i === 4) {
    output.r = n;
    output.g = 1;
    output.b = 0;
  } else {
    output.r = 1;
    output.g = n;
    output.b = 0;
  }
  output.a = 1;
}

const kRedVec4 = new THREE.Vector4(0.13572138, 4.6153926, -42.66032258, 132.13108234);
const kGreenVec4 = new THREE.Vector4(0.09140261, 2.19418839, 4.84296658, -14.18503333);
const kBlueVec4 = new THREE.Vector4(0.1066733, 12.64194608, -60.58204836, 110.36276771);
const kRedVec2 = new THREE.Vector2(-152.94239396, 59.28637943);
const kGreenVec2 = new THREE.Vector2(4.27729857, 2.82956604);
const kBlueVec2 = new THREE.Vector2(-89.90310912, 27.34824973);
const v4 = new THREE.Vector4();
const v2 = new THREE.Vector2();

// adapted from https://gist.github.com/mikhailov-work/0d177465a8151eb6ede1768d51d476c7
function turboLinear(output: ColorRGBA, pct: number): void {
  // Clamp the input between [0.0, 1.0], then scale to the range [0.01, 1.0]
  const x = clamp(pct, 0.0, 1.0) * 0.99 + 0.01;
  v4.set(1, x, x * x, x * x * x);
  v2.set(v4.z, v4.w);
  v2.multiplyScalar(v4.z);
  output.r = SRGBToLinear(clamp(v4.dot(kRedVec4) + v2.dot(kRedVec2), 0, 1));
  output.g = SRGBToLinear(clamp(v4.dot(kGreenVec4) + v2.dot(kGreenVec2), 0, 1));
  output.b = SRGBToLinear(clamp(v4.dot(kBlueVec4) + v2.dot(kBlueVec2), 0, 1));
  output.a = 1;
}

// A lookup table for the turbo() function
let TurboLookup: Float32Array | undefined;
const TURBO_LOOKUP_SIZE = 65535;

// Builds a one-time lookup table for the turbo() function then uses it to
// convert `pct` to a color
function turboLinearCached(output: ColorRGBA, pct: number): void {
  if (!TurboLookup) {
    TurboLookup = new Float32Array(TURBO_LOOKUP_SIZE * 3);
    const tempColor = { r: 0, g: 0, b: 0, a: 0 };
    for (let i = 0; i < TURBO_LOOKUP_SIZE; i++) {
      turboLinear(tempColor, i / (TURBO_LOOKUP_SIZE - 1));
      const offset = i * 3;
      TurboLookup[offset + 0] = tempColor.r;
      TurboLookup[offset + 1] = tempColor.g;
      TurboLookup[offset + 2] = tempColor.b;
    }
  }

  const offset = Math.trunc(pct * (TURBO_LOOKUP_SIZE - 1)) * 3;
  output.r = TurboLookup[offset + 0]!;
  output.g = TurboLookup[offset + 1]!;
  output.b = TurboLookup[offset + 2]!;
  output.a = 1;
}
export const RGBA_PACKED_FIELDS = new Set<string>(["rgb", "rgba"]);
export const INTENSITY_FIELDS = new Set<string>(["intensity", "i"]);

/**
 * Mutates output to select optimal color settings given a list of fields
 * @param output - settings object to apply auto selection of colorfield to
 * @param fields - array of string field names. PointField names should already have been checked for support
 * @param { supportsPackedRgbModes, supportsRgbaFieldsMode } - whether or not the message supports packed rgb modes or rgba fields mode
 */

export function autoSelectColorSettings<Settings extends ColorModeSettings>(
  output: Settings,
  fields: string[],
  {
    supportsPackedRgbModes,
    supportsRgbaFieldsMode,
  }: { supportsPackedRgbModes: boolean; supportsRgbaFieldsMode?: boolean },
): void {
  const bestField = bestColorByField(fields, { supportsPackedRgbModes });

  if (!bestField) {
    return;
  }

  output.colorField = bestField;
  switch (bestField.toLowerCase()) {
    case "rgb":
      output.colorMode = "rgb";
      break;
    case "rgba":
      output.colorMode = "rgba";
      break;
    default: // intensity, z, etc
      output.colorMode = "colormap";
      output.colorMap = "turbo";
      break;
  }

  if (supportsRgbaFieldsMode === true) {
    // does not depend on color field, so it's fine to leave as last was
    if (hasSeparateRgbaFields(fields)) {
      output.colorMode = "rgba-fields";
      return;
    }
  }
}

function bestColorByField(
  fields: string[],
  { supportsPackedRgbModes }: { supportsPackedRgbModes: boolean },
): string | undefined {
  if (supportsPackedRgbModes) {
    // first priority is color fields
    for (const field of fields) {
      if (RGBA_PACKED_FIELDS.has(field.toLowerCase())) {
        return field;
      }
    }
  }
  // second priority is intensity fields
  for (const field of fields) {
    if (INTENSITY_FIELDS.has(field.toLowerCase())) {
      return field;
    }
  }
  // third is 'z', then the first field
  return fields.find((field) => field === "z") ?? fields[0];
}

function hasSeparateRgbaFields(fields: string[]): boolean {
  let r = false;
  let g = false;
  let b = false;
  let a = false;
  for (const field of fields) {
    switch (field) {
      case "red":
        r = true;
        break;
      case "green":
        g = true;
        break;
      case "blue":
        b = true;
        break;
      case "alpha":
        a = true;
        break;
    }
  }
  return r && g && b && a;
}

export function colorModeSettingsFields<Settings extends ColorModeSettings & BaseSettings>({
  msgFields,
  config,
  defaults,
  modifiers: { supportsPackedRgbModes, supportsRgbaFieldsMode, hideFlatColor, hideExplicitAlpha },
}: {
  msgFields?: string[];
  config: Partial<Settings>;
  defaults: Pick<Settings, "gradient">;
  modifiers: {
    supportsPackedRgbModes: boolean;
    supportsRgbaFieldsMode: boolean;
    hideFlatColor?: boolean;
    hideExplicitAlpha?: boolean;
  };
}): NonNullable<SettingsTreeNode["fields"]> {
  const colorMode = config.colorMode ?? (hideFlatColor === true ? "gradient" : "flat");
  const flatColor = config.flatColor ?? "#ffffff";
  const gradient = config.gradient;
  const colorMap = config.colorMap ?? "turbo";
  const explicitAlpha = config.explicitAlpha ?? 1;
  const minValue = config.minValue;
  const maxValue = config.maxValue;

  const fields: SettingsTreeFields = {};

  const colorModeOptions = [
    { label: t("threeDee:colorModeColorMap"), value: "colormap" },
    { label: t("threeDee:gradient"), value: "gradient" },
  ];

  if (hideFlatColor !== true) {
    colorModeOptions.push({ label: t("threeDee:colorModeFlat"), value: "flat" });
  }
  if (msgFields && msgFields.length > 0) {
    if (supportsPackedRgbModes) {
      colorModeOptions.push(
        { label: t("threeDee:colorModeBgrPacked"), value: "rgb" },
        { label: t("threeDee:colorModeBgraPacked"), value: "rgba" },
      );
    }
    if (supportsRgbaFieldsMode && hasSeparateRgbaFields(msgFields)) {
      colorModeOptions.push({
        label: t("threeDee:colorModeRgbaSeparateFields"),
        value: "rgba-fields",
      });
    }
  }

  fields.colorMode = {
    label: t("threeDee:colorMode"),
    input: "select",
    value: colorMode,
    options: colorModeOptions,
  };

  if (colorMode === "flat") {
    fields.flatColor = { label: t("threeDee:flatColor"), input: "rgba", value: flatColor };
  } else if (colorMode !== "rgba-fields") {
    if (msgFields) {
      const colorFieldOptions = msgFields.map((field) => ({ label: field, value: field }));

      colorFieldOptions.push({
        label: t("threeDee:ColorFieldComputedDistance"),
        value: colorFieldComputedPrefix + "distance",
      });

      const colorField =
        config.colorField ?? bestColorByField(msgFields, { supportsPackedRgbModes });
      fields.colorField = {
        label: t("threeDee:colorBy"),
        input: "select",
        options: colorFieldOptions,
        value: colorField,
      };
    }

    switch (colorMode) {
      case "gradient":
        fields.gradient = {
          label: t("threeDee:gradient"),
          input: "gradient",
          value: gradient ?? defaults.gradient,
        };
        break;
      case "colormap":
        fields.colorMap = {
          label: t("threeDee:colorModeColorMap"),
          input: "select",
          options: [
            { label: "Turbo", value: "turbo" },
            { label: "Rainbow", value: "rainbow" },
          ],
          value: colorMap,
        };
        break;
      default:
        break;
    }

    if (hideExplicitAlpha !== true && (colorMode === "colormap" || colorMode === "rgb")) {
      fields.explicitAlpha = {
        label: t("threeDee:opacity"),
        input: "number",
        step: 0.1,
        placeholder: "1",
        precision: 3,
        min: 0,
        max: 1,
        value: explicitAlpha,
      };
    }

    if (NEEDS_MIN_MAX.includes(colorMode)) {
      fields.minValue = {
        label: t("threeDee:valueMin"),
        input: "number",
        placeholder: "auto",
        precision: 4,
        value: minValue,
      };
      fields.maxValue = {
        label: t("threeDee:valueMax"),
        input: "number",
        placeholder: "auto",
        precision: 4,
        value: maxValue,
      };
    }
  }

  return fields;
}

const tempColor = { r: 0, g: 0, b: 0, a: 0 };
export function colorHasTransparency<Settings extends ColorModeSettings>(
  settings: Settings,
): boolean {
  switch (settings.colorMode) {
    case "flat":
      return stringToRgba(tempColor, settings.flatColor).a < 1.0;
    case "gradient":
      return (
        stringToRgba(tempColor, settings.gradient[0]).a < 1.0 ||
        stringToRgba(tempColor, settings.gradient[1]).a < 1.0
      );
    case "colormap":
    case "rgb":
      return settings.explicitAlpha < 1.0;
    case "rgba":
    case "rgba-fields":
      // It's too expensive to check the alpha value of each color. Just assume it's transparent
      return true;
  }
}

// Fragment shader chunk to convert sRGB to linear RGB. This is used by some
// PointCloud materials to avoid expensive per-point colorspace conversion on
// the CPU. Source: <https://github.com/mrdoob/three.js/blob/13b67d96/src/renderers/shaders/ShaderChunk/encodings_pars_fragment.glsl.js#L16-L18>
export const FS_SRGB_TO_LINEAR = /* glsl */ `
vec3 sRGBToLinear(in vec3 value) {
	return vec3(mix(
    pow(value.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)),
    value.rgb * 0.0773993808,
    vec3(lessThanEqual(value.rgb, vec3(0.04045)))
  ));
}

vec4 sRGBToLinear(in vec4 value) {
  return vec4(sRGBToLinear(value.rgb), value.a);
}
`;
