// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * This is a helper function that merges multiple async iterators into a single async iterator.
 * Currently it load all mcaps at same time using the block loader, which is great.
 * But loading all mcaps concurrently doest not work well on current frame, messages are not in order.
 *
 * This strategy has to be more refined and can be a great solution for performance.
 */
export async function* mergeAsyncIterators<T>(
  iterators: AsyncIterableIterator<T>[],
): AsyncIterableIterator<T> {
  const promises = iterators.map(async (iterator) => await iterator.next());

  while (promises.length > 0) {
    // eslint-disable-next-line no-restricted-syntax
    const { value, index } = await Promise.race(
      // eslint-disable-next-line @typescript-eslint/no-shadow
      promises.map(async (promise, i) => await promise.then((value) => ({ value, index: i }))),
    );

    if (!(value.done ?? false)) {
      yield value.value;
      promises[index] = iterators[index]!.next();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      promises.splice(index, 1);
      iterators.splice(index, 1);
    }
  }
}
