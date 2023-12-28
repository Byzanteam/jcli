import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";
import errorHandler from "@/error-handler.ts";

import action from "./action.ts";

const command = new Command<GlobalOptions>()
  .description(
    "Set an environment variable in the current environment",
  )
  .error(errorHandler)
  .action(action);

export default command;
