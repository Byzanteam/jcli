import { Command } from "cliffy-command";
import errorHandler from "@/error-handler.ts";
import { VarOptions } from "@/subcommands/plugin/options.ts";

import action from "./action.ts";

const command = new Command<VarOptions>()
  .description("Install a plugin instance")
  .arguments("<instanceName:string>")
  .option("--prod", "Install a plugin instance in the production environment")
  .error(errorHandler)
  .action(action);

export default command;
