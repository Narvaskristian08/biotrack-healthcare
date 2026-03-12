export function runDetachedTask(taskName, work) {
  setImmediate(() => {
    Promise.resolve()
      .then(work)
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(`[BACKGROUND_TASK_ERROR] ${taskName}:`, error?.message ?? error);
      });
  });
}
