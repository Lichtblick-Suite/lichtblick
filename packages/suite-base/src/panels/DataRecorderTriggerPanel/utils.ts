// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
};

export const resetTimeout = (
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setRecordingState: React.Dispatch<React.SetStateAction<boolean | undefined>>,
  setRecordingTime: React.Dispatch<React.SetStateAction<number | undefined>>,
) => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }
  timeoutRef.current = setTimeout(() => {
    setRecordingState(false);
    setRecordingTime(0);
  }, 5000); // 5 seconds timeout
};
