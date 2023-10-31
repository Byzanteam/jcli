import * as log from "cliffy/log";

const LOGGER = "jcli";

let _logger: log.Logger;

export function setupLogger(level: log.LevelName): void {
  log.setup({
    handlers: {
      console: new log.handlers.ConsoleHandler(level),
    },
    loggers: {
      [LOGGER]: {
        level: level,
        handlers: ["console"],
      },
    },
  });

  _logger = log.getLogger(LOGGER);
}

export function getLogger(): log.Logger {
  return _logger;
}
