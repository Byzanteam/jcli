import { Command } from "@cliffy/command";
import { VarOptions } from "@/subcommands/admin/var/option.ts";
import errorHandler from "@/error-handler.ts";

import action from "./action.ts";

const command = new Command<VarOptions>()
  .description("Generate a migration file.")
  .arguments("<migrationName>")
  .error(errorHandler)
  .action(action);

export default command;
