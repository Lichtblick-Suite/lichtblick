# Flow to Typescript Migration Guide

To covert a flow file into typescript, run:

```
yarn dlx @khanacademy/flow-to-ts --prettier --write --delete-source /path/to/flow.js
```

# Cleanup

If a typescript file imports a flow file add `// @ts-expect-error` on the line before the import.
This will suppress the "cannot find module declaration error" but when we do conert the underlying file
to typescript we will get notified to remove this line. We do this instead of "declare module..." since
that silently intercepts the files we have converted.

| Flow                                    | Typescript                                                           | Notes                                           |
| --------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| `import React from 'react'`             | Remove.                                                              | We provide React globally                       |
| `import * as React from 'react'`        | Remove.                                                              | We provide React globally                       |
| `React.Ref<typeof Component>`           | `LegacyRef<Component>`                                               |                                                 |
| `React.ElementConfig<typeof Component>` | `JSX.LibraryManagedAttributes<typeof Component, Component["props"]>` | https://github.com/Khan/flow-to-ts/issues/155   |
| `import ... from 'webviz-core/src...'`  | `import ... from '@foxglove-studio/app...'`                          |                                                 |
| &#124;&#124;                            | `??`                                                                 | Most uses of &#124;&#124; should change to `??` |
| `$FlowFixMe` comments                   | Remove                                                               |                                                 |
| AnimationFrameID                        | ReturnType<typeof requestAnimationFrame>                             |                                                 |
| TimeoutID                               | ReturnType<typeof setTimeout>                                        |                                                 |
| require                                 | import                                                               | Change uses of `require` to import              |
| $Shape                                  | Partial<T>                                                           |                                                 |
| $Readonly                               | Readonly<T>                                                          |                                                 |

# Future

- Remove uses of `any`
- Disallow non-null assertions?
- Cleanup uses of "utility-types" transition module. Many have more typescript native approaches.

# References

- https://www.saltycrane.com/cheat-sheets/flow-type/latest/
- https://github.com/Kiikurage/babel-plugin-flow-to-typescript
