import { Command } from "@cliffy/command";
import { InspectOptions } from "./option.ts";
import errorHandler from "@/error-handler.ts";

import action from "./action.ts";

const command = new Command<InspectOptions>()
  .description("Inspect given function")
  .arguments("[functionName:string]")
  .option("--prod", "Print production logs")
  .error(errorHandler)
  .action(action);

export default command;
