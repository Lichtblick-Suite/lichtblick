declare module "worker-loader!*" {
  class WebpackWorker extends Worker {
    constructor();
  }

  export = WebpackWorker;
  export default WebpackWorker;
}
