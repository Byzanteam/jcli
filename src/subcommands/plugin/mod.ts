import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

import installCommand from "./install/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Work with plugin functions.")
  .command("install", installCommand);

export default command;
