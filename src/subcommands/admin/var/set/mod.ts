import { Command } from "cliffy-command";
import { VarOptions } from "@/subcommands/admin/var/option.ts";
import errorHandler from "@/error-handler.ts";

import action from "./action.ts";

const command = new Command<VarOptions>()
  .description(
    "Set an environment variable in the current environment",
  )
  .option("--prod", "Set an environment variable in the production environment")
  .arguments("<name:string> <value:string>")
  .error(errorHandler)
  .action(action);

export default command;
