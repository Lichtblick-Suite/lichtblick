// Our custom jest matcher enhacements
// Move this declaration to setupTestFramework.js once converted to typescript
declare namespace jest {
  interface Matchers<R> {
    toContainOnly(expected: T[]): R;
  }
}
