import { useEffect, useState } from "react";

// Provides basic observation of window title changes.
// Does not handle if the <title> element is removed or replaced.
export default function useDocumentTitle(defaultTitle: string): string {
  // Wait for a title element to appear if it is not present.
  const [titleElement, setTitleElement] = useState(() => document.querySelector("title"));
  useEffect(() => {
    if (titleElement) {
      return;
    }
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLTitleElement) {
            setTitleElement(node);
            observer.disconnect();
            return;
          }
        }
      }
    });
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, [titleElement]);

  // Once we have a title element, observe it for changes.
  const [title, setTitle] = useState(document.title || defaultTitle);
  useEffect(() => {
    if (titleElement) {
      const update = () => setTitle(document.title || defaultTitle);
      const observer = new MutationObserver(update);
      observer.observe(titleElement, { subtree: true, characterData: true, childList: true });
      update();
      return () => observer.disconnect();
    }
  }, [defaultTitle, titleElement]);

  return title;
}
