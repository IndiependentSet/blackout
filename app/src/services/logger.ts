/** Single place services report failures, so logging can be swapped or silenced. */
export const logger = {
  error(scope: string, err: unknown) {
    console.error(scope, err);
  },
};
