export interface Console {
  log(message: string): void;
}

export const _console: Console = {
  log: console.log,
};
