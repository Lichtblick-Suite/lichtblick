import { loadWebviz } from '@foxglove-studio/app/loadWebviz';
import { App } from '@foxglove-studio/app/App';

loadWebviz({
  Root: () => {
    return <App />;
  },
});
