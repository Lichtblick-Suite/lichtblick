import { createContext, useContext } from "react";

/** FileContext provides a way to send File instances down the tree */
const FileContext = createContext<File | undefined>(undefined);

export function useFileContext(): File | undefined {
  return useContext(FileContext);
}

export { FileContext };
