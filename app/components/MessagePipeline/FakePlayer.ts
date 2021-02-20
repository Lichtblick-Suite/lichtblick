import { $Values } from "utility-types";

//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import {
  PlayerCapabilities,
  PlayerStateActiveData,
  PlayerState,
  Player,
  SubscribePayload,
  AdvertisePayload,
} from "@foxglove-studio/app/players/types";

export default class FakePlayer implements Player {
  listener?: (arg0: PlayerState) => Promise<void>;
  playerId: string = "test";
  subscriptions: SubscribePayload[] = [];
  publishers: AdvertisePayload[] | null | undefined;
  _capabilities: $Values<typeof PlayerCapabilities>[] = [];

  setListener(listener: (arg0: PlayerState) => Promise<void>): void {
    this.listener = listener;
  }

  emit(activeData?: PlayerStateActiveData): Promise<void> {
    if (!this.listener) {
      return Promise.resolve();
    }

    return this.listener({
      playerId: this.playerId,
      isPresent: true,
      showSpinner: false,
      showInitializing: false,
      capabilities: this._capabilities,
      progress: {},
      activeData,
    });
  }

  close() {
    // no-op
  }
  setPlaybackSpeed() {
    // no-op
  }
  pausePlayback() {
    // no-op
  }
  publish() {
    // no-op
  }
  setPublishers(pubs: AdvertisePayload[]) {
    this.publishers = pubs;
  }
  setSubscriptions(subs: SubscribePayload[]) {
    this.subscriptions = subs;
  }
  setCapabilities(capabilities: $Values<typeof PlayerCapabilities>[]) {
    this._capabilities = capabilities;
  }
  startPlayback() {
    // no-op
  }
  seekPlayback() {
    // no-op
  }
  requestBackfill() {
    // no-op
  }
  setGlobalVariables() {
    // no-op
  }
}
