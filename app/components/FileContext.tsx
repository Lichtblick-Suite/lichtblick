import * as React from 'react';

/** FileContext provides a way to send File instances down the tree */
const FileContext = React.createContext<File | undefined>(undefined);

export function useFileContext(): File | undefined {
  return React.useContext(FileContext);
}

export { FileContext };
