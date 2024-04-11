import { Command } from "cliffy-command";
import errorHandler from "@/error-handler.ts";

import { GlobalOptions } from "@/args.ts";
import action from "./action.ts";

const command = new Command<GlobalOptions>()
  .description(
    "Link a local repo or project folder to an existing project on Jet.",
  )
  .arguments("<projectId> [directory]")
  .error(errorHandler)
  .action(action);

export default command;
