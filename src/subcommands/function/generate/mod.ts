import { Command } from "@cliffy/command";
import { VarOptions } from "@/subcommands/admin/var/option.ts";
import errorHandler from "@/error-handler.ts";

import action from "./action.ts";

const command = new Command<VarOptions>()
  .description("Generate a function from template.")
  .arguments("<functionName>")
  .error(errorHandler)
  .action(action);

export default command;
