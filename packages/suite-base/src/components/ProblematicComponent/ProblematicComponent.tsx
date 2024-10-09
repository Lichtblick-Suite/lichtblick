// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useState, useEffect } from 'react';

type Props = {
  userName: string;
};

const ProblematicComponent: React.FC<Props> = ({ userName }) => {
  const [count, setCount] = useState<number>(0);
  const [data, setData] = useState<any>(null);

  // Problema de complexidade - lógica de ramificação excessiva
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

  // Uso de "any", falta de tratamento de erro
  useEffect(() => {
    fetch('/api/data')
      .then(async (response) => await response.json())
      .then((result: any) => {
        setData(result);
      })
      .catch((error) => {
        console.log('Erro:', error); // Código que não lida adequadamente com o erro
      });
  }, []);

  return (
    <div>
      <h1>Hello, {userName}</h1>
      <p>Counter: {count}</p>
      <button onClick={handleClick}>Increment</button>
      {/* Renderização condicional sem verificação adequada */}
      {data ? <div>{data.name}</div> : <p>Loading...</p>}
    </div>
  );
};

export default ProblematicComponent;
