import { Console } from "@/api/mod.ts";

export interface ConsoleTest extends Console {
  logs: ReadonlyArray<string>;
  configure(options: MakeConsoleOptions): void;
}

export interface MakeConsoleOptions {
  capture?: boolean;
}

class ConsoleTestImpl implements ConsoleTest {
  #capture: boolean;
  #logs: Array<string> = [];

  constructor(options?: MakeConsoleOptions) {
    this.#capture = options?.capture ?? false;
  }

  configure(options: MakeConsoleOptions) {
    this.#capture = options.capture ?? this.#capture;
  }

  log(message: string) {
    if (this.#capture) this.#logs.push(message);
  }

  get logs() {
    return this.#logs;
  }
}

export function makeConsole(options?: MakeConsoleOptions): ConsoleTest {
  return new ConsoleTestImpl(options);
}
