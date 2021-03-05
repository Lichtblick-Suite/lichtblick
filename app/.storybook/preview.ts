import "@foxglove-studio/app/styles/global.scss";
import { getGlobalConfig } from "@foxglove-studio/app/GlobalConfig";
import waitForFonts from "@foxglove-studio/app/util/waitForFonts";

let loaded = false;

export const loaders = [
  async () => {
    // These loaders are run once for each story when you switch between stories,
    // but the global config can't be safely loaded more than once.
    if (!loaded) {
      await waitForFonts();
      await getGlobalConfig().load();
      loaded = true;
    }
  },
];

export const parameters = {
  // Disable default padding around the page body
  layout: "fullscreen",
};
