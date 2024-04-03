import { Command } from "cliffy-command";
import { GlobalOptions } from "@/args.ts";

import installCommand from "@/subcommands/plugin/install/mod.ts";
import uninstallCommand from "@/subcommands/plugin/uninstall/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Work with plugin functions.")
  .command("install", installCommand)
  .command("uninstall", uninstallCommand);

export default command;
