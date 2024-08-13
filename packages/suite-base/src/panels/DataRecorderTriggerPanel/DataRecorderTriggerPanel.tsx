// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import { PanelExtensionContext } from "@lichtblick/suite";
import { formatTime, resetTimeout } from "./utils";
import { InputField } from "./InputField";

interface RecordingInfoMessage {
  message: {
    recording: boolean;
    timestamp: number;
    duration: number;
    uuid: string;
    author: string;
    title: string;
    location: string;
    description: string;
  };
}

export function DataRecorderTriggerPanel({
  context,
}: {
  context: PanelExtensionContext;
}): JSX.Element {
  const [recordingState, setRecordingState] = useState<undefined | boolean>(undefined);
  const [recordingTime, setRecordingTime] = useState<undefined | number>(undefined);
  const [author, setAuthor] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true); // Track initial load

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);

      // Process messages for /rosbag2/recording_info
      const recordingInfoMessage = renderState.currentFrame?.find(
        (msg) => msg.topic === "/rosbag2/recording_info",
      ) as RecordingInfoMessage | undefined;

      if (recordingInfoMessage) {
        const recording = recordingInfoMessage.message.recording;
        const duration = recordingInfoMessage.message.duration;
        const author = recordingInfoMessage.message.author;
        const title = recordingInfoMessage.message.title;
        const location = recordingInfoMessage.message.location;
        setRecordingState(recording);
        setRecordingTime(duration);

        if (initialLoadRef.current) {
          setAuthor(author);
          setTitle(title);
          setLocation(location);
          initialLoadRef.current = false; // Set to false after initial load
        }

        resetTimeout(timeoutRef, setRecordingState, setRecordingTime);
      }
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.subscribe([{ topic: "/rosbag2/recording_info" }]);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [context]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  const isButtonDisabled = !author || !title || !location; // Disable button if any input is empty

  const recordingTimeStyle: React.CSSProperties = {
    fontSize: "1.5rem",
    margin: "1rem 0",
  };

  const buttonStyle: React.CSSProperties = {
    cursor: isButtonDisabled ? "not-allowed" : "pointer",
    backgroundColor: isButtonDisabled ? "grey" : "red",
    color: "black",
    padding: "0.75rem 1.5rem",
    fontSize: "1.2rem",
    borderRadius: "4px",
  };

  const handleButtonClick = async () => {
    if (context.callService) {
      try {
        const serviceRequest = {
          title: title,
          author: author,
          location: location,
        };

        let response;
        if (recordingState) {
          response = await context.callService("/rosbag2/stop_recording", serviceRequest);
        } else {
          response = await context.callService("/rosbag2/start_recording", serviceRequest);
        }
        console.log("Service response:", response);
      } catch (e) {
        console.error("Service call failed:", e);
      }
    } else {
      console.error("callService is not defined in the context.");
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Recording State Panel</h2>
      <InputField
        label="Author"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        disabled={!!recordingState} // Ensure this is always a boolean
      />
      <InputField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={!!recordingState}
      />
      <InputField
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        disabled={!!recordingState}
      />
      <p style={recordingTimeStyle}>
        Current Recording Time:{" "}
        {recordingTime !== undefined ? formatTime(recordingTime) : "00:00:00"}
      </p>
      <button onClick={handleButtonClick} disabled={isButtonDisabled} style={buttonStyle}>
        {recordingState ? "Stop Recording" : "Start Recording"}
      </button>
    </div>
  );
}
