import { Command } from "@cliffy/command";
import { GlobalOptions } from "@/args.ts";

import setCommand from "./set/mod.ts";
import unsetCommand from "./unset/mod.ts";
import listCommand from "./list/mod.ts";

const command = new Command<GlobalOptions>()
  .description(
    "Manage environment variables in the current environment",
  )
  .command("set", setCommand)
  .command("unset", unsetCommand)
  .command("list", listCommand);

export default command;
