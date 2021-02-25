// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { getLayoutFolder, getFolderIdAndLayoutNameFromLayoutId } from "./layout";

describe("getLayoutFolder", () => {
  it("works for empty and missing folder names", () => {
    expect(getLayoutFolder()).toBe("");
    expect(getLayoutFolder("")).toBe("");
  });

  it("returns the namespace and folder name for matching folders", () => {
    expect(getLayoutFolder("private/ryan/My layout@with/funny#characters")).toBe("private/ryan");
  });
});

describe("getFolderIdAndLayoutNameFromLayoutId", () => {
  it("returns the folderId and layout name for private layouts", () => {
    expect(getFolderIdAndLayoutNameFromLayoutId("private/someone@me.com/foo")).toEqual({
      folderId: "someone@me.com",
      layoutName: "foo",
    });
    expect(getFolderIdAndLayoutNameFromLayoutId("private/someone@me.com/foo/bar")).toEqual({
      folderId: "someone@me.com",
      layoutName: "foo/bar",
    });
  });
  it("returns the folderId and layout name for shared layouts", () => {
    expect(getFolderIdAndLayoutNameFromLayoutId("shared/someTeam/foo")).toEqual({
      folderId: "someTeam",
      layoutName: "foo",
    });
    expect(getFolderIdAndLayoutNameFromLayoutId("shared/someTeam/foo/bar")).toEqual({
      folderId: "someTeam",
      layoutName: "foo/bar",
    });
  });

  it("has fallbacks", () => {
    expect(getFolderIdAndLayoutNameFromLayoutId("")).toEqual({ folderId: "", layoutName: "" });
    expect(getFolderIdAndLayoutNameFromLayoutId("/")).toEqual({ folderId: "", layoutName: "" });
    expect(getFolderIdAndLayoutNameFromLayoutId("private/")).toEqual({
      folderId: "",
      layoutName: "",
    });
    expect(getFolderIdAndLayoutNameFromLayoutId("private/foo")).toEqual({
      folderId: "foo",
      layoutName: "",
    });
    expect(getFolderIdAndLayoutNameFromLayoutId("/foo")).toEqual({
      folderId: "foo",
      layoutName: "",
    });
  });
});
