// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2020-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.
import { Dispatcher, Comment } from "@foxglove-studio/app/reducers";

enum COMMENTING_ACTION_TYPES {
  SET_FETCHED_COMMENTS_BASE = "SET_FETCHED_COMMENTS_BASE",
  SET_FETCHED_COMMENTS_FEATURE = "SET_FETCHED_COMMENTS_FEATURE",
  SET_SOURCE_TO_SHOW = "SET_SOURCE_TO_SHOW",
}

type SET_FETCHED_COMMENTS_BASE = { type: "SET_FETCHED_COMMENTS_BASE"; payload: Comment[] };
export const setFetchedCommentsBase = (
  payload: Comment[],
): Dispatcher<SET_FETCHED_COMMENTS_BASE> => (dispatch) => {
  return dispatch({ type: COMMENTING_ACTION_TYPES.SET_FETCHED_COMMENTS_BASE, payload });
};

type SET_FETCHED_COMMENTS_FEATURE = { type: "SET_FETCHED_COMMENTS_FEATURE"; payload: Comment[] };
export const setFetchedCommentsFeature = (
  payload: Comment[],
): Dispatcher<SET_FETCHED_COMMENTS_FEATURE> => (dispatch) => {
  return dispatch({ type: COMMENTING_ACTION_TYPES.SET_FETCHED_COMMENTS_FEATURE, payload });
};

export type CommentSourceToShow = "Both" | "Base" | "Feature";
type SET_SOURCE_TO_SHOW = { type: "SET_SOURCE_TO_SHOW"; payload: CommentSourceToShow };
export const setSourceToShow = (payload: CommentSourceToShow): Dispatcher<SET_SOURCE_TO_SHOW> => (
  dispatch,
) => {
  return dispatch({ type: COMMENTING_ACTION_TYPES.SET_SOURCE_TO_SHOW, payload });
};

export type CommentingActions =
  | SET_FETCHED_COMMENTS_BASE
  | SET_FETCHED_COMMENTS_FEATURE
  | SET_SOURCE_TO_SHOW;
