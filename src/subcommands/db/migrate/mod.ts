import { Command } from "@cliffy/command";
import { GlobalOptions } from "@/args.ts";
import errorHandler from "@/error-handler.ts";

import action from "./action.ts";

const command = new Command<GlobalOptions>()
  .description(
    "Migrate database to the latest version.",
  )
  .error(errorHandler)
  .action(action);

export default command;
