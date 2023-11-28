import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

import deployCommand from "./deploy/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Work with project functions.")
  .command("deploy", deployCommand);

export default command;
