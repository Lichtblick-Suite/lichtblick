declare module "sharedworker-loader?*" {
  class WebpackWorker extends Worker {
    constructor();
  }

  export = WebpackWorker;
  export default WebpackWorker;
}
