import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

import deployCommand from "./deploy/mod.ts";
import logsCommand from "./logs/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Work with project functions.")
  .command("deploy", deployCommand)
  .command("logs", logsCommand);

export default command;
