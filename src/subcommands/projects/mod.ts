import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

const command = new Command<GlobalOptions>()
  .description("Work with Jet projects.");

export default command;
