// exposes React into the global scope to avoid "import React from 'react'" in every component
/// <reference types="react" />

declare global {
  namespace React {}
}

export {};
