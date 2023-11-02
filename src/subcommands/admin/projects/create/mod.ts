import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";
import errorHandler from "@/error-handler.ts";

import action from "@/subcommands/admin/projects/create/action.ts";

const command = new Command<GlobalOptions>()
  .description(
    "Create a project on server and link it with a local directory.",
  )
  .arguments("<projectName:string>")
  .error(errorHandler)
  .action(action);

export default command;
