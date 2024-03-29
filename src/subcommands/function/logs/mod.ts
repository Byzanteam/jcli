import { Command } from "cliffy";
import { LogsOptions } from "./option.ts";
import errorHandler from "@/error-handler.ts";

import action from "./action.ts";

const command = new Command<LogsOptions>()
  .description("Print function logs")
  .arguments("[functionName:string]")
  .option("-n, --length <length:number>", "Length of logs to print")
  .option("--prod", "Print production logs")
  .error(errorHandler)
  .action(action);

export default command;
