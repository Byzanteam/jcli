import { Command } from "cliffy";
import errorHandler from "@/error-handler.ts";

import { DeployOptions } from "./option.ts";
import action from "./action.ts";

const command = new Command<DeployOptions>()
  .description("Deploy project in Jet.")
  .option("--commit <commit>", "Specify the commit to be deployed.")
  .error(errorHandler)
  .action(action);

export default command;
