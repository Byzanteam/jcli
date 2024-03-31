import { Command } from "cliffy";
import errorHandler from "@/error-handler.ts";

import { GlobalOptions } from "@/args.ts";
import action from "./action.ts";

const command = new Command<GlobalOptions>()
  .description("Link a Jet project.")
  .arguments("<projectId> [directory]")
  .error(errorHandler)
  .action(action);

export default command;
