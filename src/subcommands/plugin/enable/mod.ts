import { Command } from "cliffy";
import errorHandler from "@/error-handler.ts";
import { VarOptions } from "@/subcommands/plugin/enable/options.ts";

import action from "./action.ts";

const command = new Command<VarOptions>()
  .description("Enable a plugin instance")
  .arguments("<instanceName:string>")
  .option("--prod", "Enable a plugin instance in the production environment")
  .error(errorHandler)
  .action(action);

export default command;
