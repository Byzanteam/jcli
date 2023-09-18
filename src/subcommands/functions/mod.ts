import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

const command = new Command<GlobalOptions>()
  .description("Work with project functions.");

export default command;
