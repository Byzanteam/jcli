import { Command, EnumType } from "@cliffy/command";
import errorHandler from "@/error-handler.ts";

import { includeCategories, PushOptions } from "./option.ts";
import action from "./action.ts";

const includeType = new EnumType(includeCategories);

const command = new Command<PushOptions>()
  .description("Push local changes to Jet.")
  .type("include", includeType)
  .option(
    "--include <category:category>",
    "Pushes only changes of the specified category",
    { collect: true },
  )
  .error(errorHandler)
  .action(action);

export default command;
