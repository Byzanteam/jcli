import { Command } from "cliffy";
import { VarOptions } from "@/subcommands/admin/var/option.ts";
import errorHandler from "@/error-handler.ts";

import action from "./action.ts";

const command = new Command<VarOptions>()
  .description(
    "Unset an environment variable in the current environment",
  )
  .arguments("<name:string>")
  .option(
    "--prod",
    "Unset an environment variable in the production environment",
  )
  .error(errorHandler)
  .action(action);

export default command;
