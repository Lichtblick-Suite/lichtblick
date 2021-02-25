type WebpackArgv = {
  mode?: string;
  env?: { WEBPACK_SERVE?: boolean; WEBPACK_BUNDLE?: boolean; WEBPACK_BUILD?: boolean };
};

export type { WebpackArgv };
