// exposes React into the global scope to avoid "import React from 'react'" in every component
export = {};

declare global {
  import React from "react";
  const React: React;
}
