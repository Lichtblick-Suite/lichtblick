// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// This file is not used in the app, but exists to test that our eslint config catches the code we want it to catch.
// Because we run eslint with --report-unused-disable-directives, any unused comments will be errors.

/* eslint-disable @typescript-eslint/no-unused-expressions */

({
  // eslint-disable-next-line no-restricted-syntax
  get x() {
    return 1;
  },
  // @ts-expect-error unused variable
  // eslint-disable-next-line no-restricted-syntax
  set x(newX) {},
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(str: string, wut: any) => {
  console.log = () => 0;
  console.log(str); // eslint-disable-line no-restricted-syntax

  // All nulls are banned
  wut == null; // eslint-disable-line no-restricted-syntax
};

// @ts-expect-error unused function
function useEffectOnce() {} // eslint-disable-line id-denylist, @typescript-eslint/no-unused-vars

class Foo {
  private bar = 1;
  private static baz = 1;

  private foo() {
    this.bar = 2;
  }

  private static getBaz() {
    this.baz = 3;
    void this.baz;
  }
  public asdf() {
    this.foo();
    Foo.getBaz();
    void this.bar;
  }
}
void Foo;

// keep isolatedModules happy
export default {};
