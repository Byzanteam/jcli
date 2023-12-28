import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

import setCommand from "./set/mod.ts";
import unsetCommand from "./unset/mod.ts";

const command = new Command<GlobalOptions>()
  .description(
    "Manage environment variables in the current environment",
  )
  .command("set", setCommand)
  .command("unset", unsetCommand);

export default command;
