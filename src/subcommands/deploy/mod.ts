import { Command } from "@cliffy/command";
import { GlobalOptions } from "@/args.ts";
import errorHandler from "@/error-handler.ts";

import action from "./action.ts";

const command = new Command<GlobalOptions>()
  .description("Deploy project in Jet.")
  .arguments("[commit:string]")
  .error(errorHandler)
  .action(action);

export default command;
