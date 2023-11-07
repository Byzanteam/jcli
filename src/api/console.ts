export interface Console {
  log(message: string): void;
}

export const consoleImpl: Console = {
  log: console.log,
};
