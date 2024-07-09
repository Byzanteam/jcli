import { Command } from "@cliffy/command";
import { GlobalOptions } from "@/args.ts";
import errorHandler from "@/error-handler.ts";

import action from "./action.ts";

const command = new Command<GlobalOptions>()
  .description(
    "List executed migration versions on Jet.",
  )
  .error(errorHandler)
  .action(action);

export default command;
