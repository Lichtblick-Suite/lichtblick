# Flow to Typescript Migration Guide

To covert a flow file into typescript, run:

```
yarn dlx @khanacademy/flow-to-ts --prettier --write --delete-source /path/to/flow.js
```

# Cleanup

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

# Future

- Remove uses of `any`
- Disallow non-null assertions?
- Cleanup uses of "utility-types" transition module. Many have more typescript native approaches.

# References

- https://www.saltycrane.com/cheat-sheets/flow-type/latest/
