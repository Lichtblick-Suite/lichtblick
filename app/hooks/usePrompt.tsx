import React, { useRef } from "react";
import styled from "styled-components";

// @ts-expect-error
import Modal from "@foxglove-studio/app/components/Modal";
import Button from "@foxglove-studio/app/components/Button";
// @ts-expect-error
import renderToBody from "@foxglove-studio/app/components/renderToBody";

type PromptFunction = () => Promise<string | undefined>;

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

function usePrompt(initialValue: string): PromptFunction {
  const valueRef = useRef<string>(initialValue);

  const handleInputEvent: React.ChangeEventHandler<HTMLInputElement> = (ev) => {
    valueRef.current = ev.target.value;
  };

  return async () => {
    return new Promise((resolve) => {
      const modal = renderToBody(
        <Modal
          onRequestClose={() => {
            modal.remove();
            resolve(undefined);
          }}
        >
          <ModalContent>
            <div>
              <input
                style={{ width: "100%" }}
                type="text"
                defaultValue={valueRef.current}
                onChange={handleInputEvent}
              />
            </div>
            <ModalActions>
              <Button
                onClick={() => {
                  modal.remove();
                  resolve(undefined);
                }}
              >
                Cancel
              </Button>
              <Button
                primary={true}
                onClick={() => {
                  modal.remove();
                  resolve(valueRef.current);
                }}
              >
                OK
              </Button>
            </ModalActions>
          </ModalContent>
        </Modal>,
      );
    });
  };
}

export { usePrompt };
