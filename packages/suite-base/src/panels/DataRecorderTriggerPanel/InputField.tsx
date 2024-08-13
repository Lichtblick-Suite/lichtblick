// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import React from "react";

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, disabled }) => {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    marginBottom: "1rem",
    alignItems: "center",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "1.2rem",
    width: "100px", // Set a fixed width for the labels to align them
  };

  const inputStyle: React.CSSProperties = {
    fontSize: "1.2rem",
    flex: 1,
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>{label}:</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        style={inputStyle}
        disabled={disabled} // Disable input if recordingState is true
      />
    </div>
  );
};
