import { api } from "@/api/mod.ts";
import { GlobalOptions } from "@/args.ts";
import { MIGRATION_NAME_REGEX } from "@/jet/migration.ts";

const migrationTemplateCode = `-- migrate:up\n\n-- migrate:down`;

const migrationNameRegex = new RegExp(`^${MIGRATION_NAME_REGEX.source}$`);

export default async function createMigration(
  _options: GlobalOptions,
  migrationName: string,
) {
  if (!migrationNameRegex.test(migrationName)) {
    api.console.log(
      "Invalid migration name. Only lowercase letters, numbers, and underscores are allowed, with a maximum length of 255 characters.",
    );
    return undefined;
  }

  const timestamp = new Date()
    .toISOString().replace(/[-T:\.Z]/g, "")
    .slice(0, 12);
  const fileName = `${timestamp}_${migrationName}.sql`;
  const dirPath = "migrations";
  const filePath = `${dirPath}/${fileName}`;

  try {
    await api.fs.mkdir(dirPath, { recursive: true });
    await api.fs.writeTextFile(filePath, migrationTemplateCode, {
      createNew: true,
    });
  } catch (error) {
    api.console.log(`Error creating migration file '${filePath}':${error}`);
  }
}
