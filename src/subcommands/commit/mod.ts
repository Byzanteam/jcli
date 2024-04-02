import { Command } from "cliffy-command";
import errorHandler from "@/error-handler.ts";

import { CommitOptions } from "./option.ts";
import action from "./action.ts";

const command = new Command<CommitOptions>()
  .description("Commit changes in Jet.")
  .option("--message <message>", "The message of commit.")
  .error(errorHandler)
  .action(action);

export default command;
