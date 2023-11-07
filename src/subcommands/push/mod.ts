import { Command } from "cliffy";
import errorHandler from "@/error-handler.ts";

import { PushOptions } from "./option.ts";
import action from "./action.ts";

const command = new Command<PushOptions>()
  .description("Push local changes to Jet.")
  .option("--only-functions", "Pushes only changes of functions")
  .option("--only-migrations", "Pushes only changes of migrations")
  .error(errorHandler)
  .action(action);

export default command;
