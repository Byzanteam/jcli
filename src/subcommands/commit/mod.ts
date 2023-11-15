import { Command } from "cliffy";
import errorHandler from "@/error-handler.ts";

import { CommitOptions } from "./option.ts";
import action from "./action.ts";

const command = new Command<CommitOptions>()
  .description("Commit changes in Jet.")
  .option("--message <message>", "Pushes only changes of functions")
  .error(errorHandler)
  .action(action);

export default command;
