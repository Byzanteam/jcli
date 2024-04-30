import { Command } from "cliffy-command";
import { VarOptions } from "@/subcommands/admin/var/option.ts";
import errorHandler from "@/error-handler.ts";

import action from "./action.ts";

const command = new Command<VarOptions>()
  .description("Deploy draft functions in Jet.")
  .option("--prod", "Deploy functions in the production environment")
  .error(errorHandler)
  .action(action);

export default command;
