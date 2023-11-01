import { Command, ValidationError } from "cliffy";
import { getLogger } from "@/jcli/logger.ts";

export default function <T>(error: T, cmd: Command) {
  const logger = getLogger();

  if (error instanceof ValidationError) {
    cmd.showHelp();
  } else if (error instanceof Error) {
    logger.error(error.message);
  } else {
    logger.error({ error: error });
  }

  Deno.exit(error instanceof ValidationError ? error.exitCode : 1);
}
