export function createSaveQueue(save) {
  let tail = Promise.resolve();
  return { enqueue(patch) {
    // Serialize commits; an earlier failure does not poison a later recovery save.
    const work = tail.catch(() => {}).then(() => save(patch));
    tail = work;
    return work;
  }, flush() { return tail; } };
}
