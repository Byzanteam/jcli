import { Command } from "@cliffy/command";
import { GlobalOptions } from "@/args.ts";

import deployCommand from "./deploy/mod.ts";
import logsCommand from "./logs/mod.ts";
import inspectCommand from "./inspect/mod.ts";
import generateCommand from "./generate/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Work with project functions.")
  .command("deploy", deployCommand)
  .command("logs", logsCommand)
  .command("inspect", inspectCommand)
  .command("generate", generateCommand);

export default command;
