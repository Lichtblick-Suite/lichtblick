// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useState } from "react";
import styled from "styled-components";

import Modal from "@foxglove-studio/app/components/Modal";
import Button from "@foxglove-studio/app/components/Button";
import renderToBody from "@foxglove-studio/app/components/renderToBody";

const ModalContent = styled.div`
  overflow-y: auto;
  padding: 25px;
  padding-top: 48px;
  width: 300px;
`;

const ModalActions = styled.div`
  padding-top: 10px;
  text-align: right;
`;

function ModalPrompt({
  initialValue,
  onComplete,
}: {
  initialValue: string;
  onComplete: (value: string | undefined) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <Modal onRequestClose={() => onComplete(undefined)}>
      <ModalContent>
        <div>
          <input
            style={{ width: "100%" }}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <ModalActions>
          <Button onClick={() => onComplete(undefined)}>Cancel</Button>
          <Button primary={true} onClick={() => onComplete(value)}>
            OK
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  );
}

function runPrompt(initialValue: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const modal = renderToBody(
      <ModalPrompt
        initialValue={initialValue}
        onComplete={(value) => {
          modal.remove();
          resolve(value);
        }}
      />,
    );
  });
}

// Returns a function that can be used similarly to the DOM prompt(), but
// backed by a React element rather than a native modal, and asynchronous.
export function usePrompt(): (initialValue: string) => Promise<string | undefined> {
  return runPrompt;
}
