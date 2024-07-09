import { Command } from "@cliffy/command";
import errorHandler from "@/error-handler.ts";

import { GlobalOptions } from "@/args.ts";
import action from "./action.ts";

const command = new Command<GlobalOptions>()
  .description("Clone a Jet project.")
  .arguments("<projectId> [directory]")
  .error(errorHandler)
  .action(action);

export default command;
