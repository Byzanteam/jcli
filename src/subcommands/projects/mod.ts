import { Command } from "cliffy-command";
import { GlobalOptions } from "@/args.ts";

const command = new Command<GlobalOptions>()
  .description("Work with Jet projects.");

export default command;
