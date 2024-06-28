import { Command, CompletionsCommand } from "@cliffy/command";

import denoJson from "./deno.json" with { type: "json" };

import { getConfig } from "@/api/mod.ts";
import { setupLogger } from "@/jcli/logger.ts";

import { action as globalOptionAction } from "@/args.ts";

import projectsCommand from "@/subcommands/projects/mod.ts";
import migrationsCommand from "@/subcommands/migrations/mod.ts";
import functionCommand from "@/subcommands/function/mod.ts";
import adminCommand from "@/subcommands/admin/mod.ts";
import pushCommand from "@/subcommands/push/mod.ts";
import dbCommand from "@/subcommands/db/mod.ts";
import commitCommand from "@/subcommands/commit/mod.ts";
import deployCommand from "@/subcommands/deploy/mod.ts";
import cloneCommand from "@/subcommands/clone/mod.ts";
import generateCommand from "@/subcommands/generate/mod.ts";
import pluginCommand from "@/subcommands/plugin/mod.ts";
import linkCommand from "@/subcommands/link/mod.ts";
import createUpgradeCommand from "@/subcommands/upgrade/mod.ts";

const DEFAULT_LOG_LEVEL = "INFO";
const { logLevel = DEFAULT_LOG_LEVEL } = await getConfig().get();
setupLogger(logLevel);

const upgradeCommand = await createUpgradeCommand();

await new Command()
  .name("jcli")
  .version(denoJson.version)
  .description("Jet command-line tool")
  .globalOption("-d, --debug", "Enable debug output.", {
    action: globalOptionAction,
  })
  .command("admin", adminCommand)
  .command("projects", projectsCommand)
  .command("migrations", migrationsCommand)
  .command("function", functionCommand)
  .command("push", pushCommand)
  .command("db", dbCommand)
  .command("commit", commitCommand)
  .command("deploy", deployCommand)
  .command("clone", cloneCommand)
  .command("generate", generateCommand)
  .command("plugins", pluginCommand)
  .command("link", linkCommand)
  .command("upgrade", upgradeCommand as unknown as Command)
  .command("completions", new CompletionsCommand())
  .parse(Deno.args);
