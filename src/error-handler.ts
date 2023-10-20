import { Command, ValidationError } from "cliffy";

export default function <T>(error: T, cmd: Command) {
  if (error instanceof ValidationError) {
    cmd.showHelp();
  } else if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.log({ error: error });
  }

  Deno.exit(error instanceof ValidationError ? error.exitCode : 1);
}
