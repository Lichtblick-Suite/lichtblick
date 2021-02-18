//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isPlainObject } from "lodash";

import {
  processMessage,
  registerNode,
} from "@foxglove-studio/app/players/UserNodePlayer/nodeRuntimeWorker/registry";
import transform from "@foxglove-studio/app/players/UserNodePlayer/nodeTransformerWorker/transformer";
import generateRosLib from "@foxglove-studio/app/players/UserNodePlayer/nodeTransformerWorker/typegen";
import { BobjectRpcReceiver } from "@foxglove-studio/app/util/binaryObjects/BobjectRpc";
import Rpc, { Channel, createLinkedChannels } from "@foxglove-studio/app/util/Rpc";

const validateWorkerArgs = (arg: any) => {
  expect(arg).not.toBeInstanceOf(Function);

  if (isPlainObject(arg)) {
    Object.values(arg).forEach((val) => {
      validateWorkerArgs(val);
    });
  } else if (Array.isArray(arg)) {
    arg.forEach(validateWorkerArgs);
  }
};

// One test class that implements both typescript compilation and message transformation.
export default class MockUserNodePlayerWorker {
  port: Channel;

  constructor() {
    const { local, remote } = createLinkedChannels();
    this.port = local;

    (local as any).start = () => {
      // no-op
    };
    const receiver = new Rpc(remote);
    const receiveAndLog = (action: any, impl: any) => {
      receiver.receive(action, (...args) => {
        validateWorkerArgs(args);
        this.messageSpy(action);
        const ret = impl(...args);
        validateWorkerArgs(ret);
        return ret;
      });
    };
    receiveAndLog("generateRosLib", generateRosLib);
    receiveAndLog("transform", transform);
    receiveAndLog("registerNode", registerNode);
    new BobjectRpcReceiver(receiver).receive(
      "processMessage",
      "parsed",
      async (message, globalVariables) => {
        this.messageSpy("processMessage");
        return processMessage({ message, globalVariables });
      },
    );
  }

  // So tests can spy on what gets called
  messageSpy(_action: string) {
    // no-op
  }
}
