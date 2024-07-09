import { Command } from "@cliffy/command";
import { GlobalOptions } from "@/args.ts";

const command = new Command<GlobalOptions>()
  .description("Work with project migrations.");

export default command;
