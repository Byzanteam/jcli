import { Command } from "@cliffy/command";
import errorHandler from "@/error-handler.ts";

import { GlobalOptions } from "@/args.ts";
import action from "./action.ts";

const command = new Command<GlobalOptions>()
  .description("Add the credential, replace it if it exists.")
  .arguments("<token>")
  .error(errorHandler)
  .action(action);

export default command;
