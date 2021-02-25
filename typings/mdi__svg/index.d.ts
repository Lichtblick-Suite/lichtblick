// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/// <reference types="react" />

declare module "*.svg" {
  const IconComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default IconComponent;
}
