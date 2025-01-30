// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { Heap } from "heap-js";

import { toMillis } from "@lichtblick/rostime";
import { IteratorResult } from "@lichtblick/suite-base/players/IterablePlayer/IIterableSource";

/**
 * This is a helper function that merges multiple async iterators into a single async iterator.
 * Currently it load all mcaps at same time using the block loader, which is great.
 * But loading all mcaps concurrently doest not work well on current frame, messages are not in order.
 *
 * This strategy has to be more refined and can be a great solution for performance.
 */
// export async function* mergeAsyncIterators<T>(
//   iterators: AsyncIterableIterator<T>[],
// ): AsyncIterableIterator<T> {
//   const promises = iterators.map(async (iterator) => await iterator.next());

//   while (promises.length > 0) {
//     // eslint-disable-next-line no-restricted-syntax
//     const { value, index } = await Promise.race(
//       // eslint-disable-next-line @typescript-eslint/no-shadow
//       promises.map(async (promise, i) => await promise.then((value) => ({ value, index: i }))),
//     );

//     if (!(value.done ?? false)) {
//       yield value.value;
//       promises[index] = iterators[index]!.next();
//     } else {
//       // eslint-disable-next-line @typescript-eslint/no-floating-promises
//       promises.splice(index, 1);
//       iterators.splice(index, 1);
//     }
//   }
// }

/**
 * IT WORKS
 * but with same performance.
 */

// export async function* mergeAsyncIterators<T extends IteratorResult>(
//   iterators: AsyncIterableIterator<T>[],
// ): AsyncIterableIterator<T> {
//   const queue: { value: T; iterator: AsyncIterableIterator<T> }[] = [];

//   // Init first messages from each iterator
//   await Promise.all(
//     iterators.map(async (iterator) => {
//       const result = await iterator.next();
//       if (!(result.done ?? false)) {
//         queue.push({ value: result.value, iterator });
//       }
//     }),
//   );

//   queue.sort((a, b) => getTime(a.value) - getTime(b.value));

//   while (queue.length > 0) {
//     // Remove old messages
//     const { value, iterator } = queue.shift()!;
//     yield value;

//     // next message from same iterator
//     const nextResult = await iterator.next();
//     if (!(nextResult.done ?? false)) {
//       queue.push({ value: nextResult.value, iterator });
//       queue.sort((a, b) => getTime(a.value) - getTime(b.value));
//     }
//   }
// }

/**
 * IT WORKS
 * but with same performance.
 */
export async function* mergeAsyncIterators<T extends IteratorResult>(
  iterators: AsyncIterableIterator<T>[],
): AsyncIterableIterator<T> {
  const heap = new Heap<{ value: T; iterator: AsyncIterableIterator<T> }>(
    (a, b) => getTime(a.value) - getTime(b.value),
  );

  await Promise.all(
    iterators.map(async (iterator) => {
      const result = await iterator.next();
      if (!(result.done ?? false)) {
        heap.push({ value: result.value, iterator });
      }
    }),
  );

  while (!heap.isEmpty()) {
    const { value, iterator } = heap.pop()!;
    yield value;

    const nextResult = await iterator.next();
    if (!(nextResult.done ?? false)) {
      heap.push({ value: nextResult.value, iterator });
    }
  }
}

function getTime(event: IteratorResult): number {
  if (event.type === "stamp") {
    return toMillis(event.stamp);
  }
  if (event.type === "message-event") {
    return toMillis(event.msgEvent.receiveTime);
  }
  return Number.MAX_SAFE_INTEGER;
}
