import { Command } from "@cliffy/command";
import errorHandler from "@/error-handler.ts";

import { PushOptions } from "./option.ts";
import action from "./action.ts";

const command = new Command<PushOptions>()
  .description("Push local changes to Jet.")
  .option("--only-functions", "Pushes only changes of functions")
  .option("--only-migrations", "Pushes only changes of migrations")
  .option("--only-workflows", "Pushes only changes of workflows")
  .error(errorHandler)
  .action(action);

export default command;
