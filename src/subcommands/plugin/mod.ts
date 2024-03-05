import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

import enableCommand from "./enable/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Work with plugin functions.")
  .command("enable", enableCommand);

export default command;
