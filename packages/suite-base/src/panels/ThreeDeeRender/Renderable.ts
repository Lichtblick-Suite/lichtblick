// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import type { RosValue } from "@lichtblick/suite-base/players/types";
import * as THREE from "three";

import type { IRenderer } from "./IRenderer";
import type { BaseSettings } from "./settings";
import type { Pose } from "./transforms";

export const SELECTED_ID_VARIABLE = "selected_id";

export type BaseUserData = {
  /** Timestamp when the associated `MessageEvent` was received */
  receiveTime: bigint;
  /** Timestamp extracted from a field in the associated message, such as `header.stamp` */
  messageTime: bigint;
  /** Coordinate frame this Renderable exists in */
  frameId: string;
  /** Local position and orientation of the Renderable */
  pose: Pose;
  /** Settings tree path where errors will be displayed */
  settingsPath: ReadonlyArray<string>;
  /** User-customizable settings for this Renderable */
  settings: BaseSettings;
  /** Topic that the Renderable belongs to, if applicable*/
  topic?: string;
};

/**
 * Renderables are generic THREE.js scene graph entities with additional
 * properties from `BaseUserData` that allow coordinate frame transforms to
 * automatically be applied and settings tree errors to be displayed.
 *
 * TRenderer may be set to `undefined` to opt out of access to the bloated IRenderer interface.
 */
export class Renderable<
  TUserData extends BaseUserData = BaseUserData,
  TRenderer extends IRenderer | undefined = IRenderer,
> extends THREE.Object3D {
  /** Identifies this class as inheriting from `Renderable` */
  public readonly isRenderable = true;
  /** Allow this Renderable to be selected during picking and shown in the Object Details view */
  public readonly pickable: boolean = true;
  /**
   * Use a second picking pass for this Renderable to select a single numeric instanceId. This
   * instanceId can be passed to `instanceDetails()` to get more information about the instance.
   */
  public readonly pickableInstances: boolean = false;
  /** A reference to the parent `Renderer` that owns the scene graph containing this object */
  protected readonly renderer: TRenderer;
  /** Additional data associated with this entity */
  public override userData: TUserData;

  public constructor(name: string, renderer: TRenderer, userData: TUserData) {
    super();
    this.name = name;
    this.renderer = renderer;
    this.userData = userData;
  }

  /**
   * Dispose of any unmanaged resources uniquely associated with this Renderable
   * such as GPU buffers.
   */
  public dispose(): void {
    this.children.length = 0;
  }

  /**
   * A unique identifier for this Renderable, taken from the associated message.
   */
  public idFromMessage(): number | string | undefined {
    return undefined;
  }

  /**
   * The name of the variable that will be set to `idFromMessage()` on user selection.
   */
  public selectedIdVariable(): string | undefined {
    return undefined;
  }

  /**
   * Return a Plain Old JavaScript Object (POJO) representation of this Renderable.
   */
  public details(): Record<string, RosValue> {
    return {};
  }

  /**
   * Return topic if one exists on the userData.
   */
  // eslint-disable-next-line no-restricted-syntax
  public get topic(): TUserData["topic"] {
    return this.userData.topic;
  }

  /**
   * Return pose as defined in userData
   */
  // eslint-disable-next-line no-restricted-syntax
  public get pose(): Pose {
    return this.userData.pose;
  }
  /**
   * Return a Plain Old JavaScript Object (POJO) representation of a specific
   * visual instance rendered by this Renderable.
   */
  public instanceDetails(instanceId: number): Record<string, RosValue> | undefined {
    void instanceId;
    return undefined;
  }
}
