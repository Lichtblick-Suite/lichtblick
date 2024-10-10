// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import React, { useState, useEffect } from 'react';

type Props = {
  userName: string;
};

const ProblematicComponent: React.FC<Props> = ({ userName }) => {
  const [count, setCount] = useState<number>(0);
  const [data, setData] = useState<string>("null");

  // Complexity issue - bad logic
  const handleClick = () => {
    if (count === 0) {
      setCount(count + 1);
    } else if (count > 0 && count < 5) {
      setCount(count + 2);
    } else if (count >= 5 && count < 10) {
      setCount(count + 3);
    } else {
      setCount(0);
    }
  };


  useEffect(() => {
    fetch('/api/data')
      .then(async (response) => await response.json())
      .then((result: string) => {
        setData(result);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }, []);

  return (
    <div>
      <h1>Hello, {userName}</h1>
      <p>Counter: {count}</p>
      <button onClick={handleClick}>Increment</button>
      <p>{data}</p>
    </div>
  );
};

export default ProblematicComponent;
