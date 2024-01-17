import { api, PROJECT_DB_PATH } from "@/api/mod.ts";
import { createMetadataQuery } from "@/api/db/queries/create-metadata.ts";
import { createTableObjectsQuery } from "@/api/db/queries/create-table-objects.ts";
import { createFunctionsQuery } from "@/api/db/queries/create-functions.ts";
import { createConfigurationQuery } from "@/api/db/queries/create-configuration.ts";

import { Config } from "@/jcli/config/config.ts";
import {
  ProjectDotJSON,
  projectDotJSONPath,
} from "@/jcli/config/project-json.ts";
import { dirname, join } from "path";

class ProjectBuilder {
  constructor(public configuration: ProjectDotJSON) {}

  async provisionFiles(): Promise<void> {
    const projectName = this.configuration.name;

    await api.fs.mkdir(projectName);
    await api.fs.mkdir(join(projectName, "migrations"));
    await api.fs.mkdir(join(projectName, "functions"));
    await api.fs.mkdir(join(projectName, ".jcli"));

    const projectDotJSON = new Config<ProjectDotJSON>(
      projectDotJSONPath(projectName),
    );

    await projectDotJSON.set(this.configuration, { createNew: true });
  }

  provisionDatabases(): void {
    const db = api.db.createDatabase(
      `${this.configuration.name}/${PROJECT_DB_PATH}`,
    );

    db.execute(createMetadataQuery);
    db.execute(createTableObjectsQuery);
    db.execute(createFunctionsQuery);
    db.execute(createConfigurationQuery);

    db.query<never>("INSERT INTO configuration (data) VALUES (:data);", {
      data: JSON.stringify(this.configuration.toJSON()),
    });

    db.close();
  }

  async buildMetadata(projectId: string) {
    const db = await this.#connectDB();

    db.query("INSERT INTO metadata (project_id) VALUES (:projectId)", {
      projectId,
    });

    db.close();
  }

  async buildMigrations(
    migrations: AsyncIterable<{
      version: number;
      name: string | null;
      hash: string;
      content: string;
    }>,
  ) {
    const db = await this.#connectDB();

    const createMigrationQuery = db.prepareQuery<
      never,
      never,
      { path: string; hash: string }
    >(
      "INSERT INTO objects (path, hash, filetype) VALUES (:path, :hash, 'MIGRATION')",
    );

    for await (const { version, name, hash, content } of migrations) {
      const path = name
        ? join("migrations", `${version}_${name}.sql`)
        : join("migrations", `${version}.sql`);

      await api.fs.writeTextFile(join(this.configuration.name, path), content, {
        createNew: true,
      });

      createMigrationQuery.execute({ path, hash });
    }

    createMigrationQuery.finalize();
    db.close();
  }

  async buildFunctions(
    functions: AsyncIterable<{
      name: string;
      files: ReadonlyArray<{
        path: string;
        hash: string;
        code: string;
      }>;
    }>,
  ) {
    const db = await this.#connectDB();

    const createFunctionQuery = db.prepareQuery<
      never,
      never,
      { name: string }
    >(
      "INSERT INTO functions (name) VALUES (:name)",
    );

    const createFunctionFileQuery = db.prepareQuery<
      never,
      never,
      { path: string; hash: string }
    >(
      "INSERT INTO objects (path, hash, filetype) VALUES (:path, :hash, 'FUNCTION')",
    );

    for await (const func of functions) {
      createFunctionQuery.execute({ name: func.name });

      for (const { path, hash, code } of func.files) {
        const filePath = join("functions", func.name, path);

        writeFunctionFile(join(this.configuration.name, filePath), code);

        createFunctionFileQuery.execute({
          path: filePath,
          hash,
        });
      }
    }

    createFunctionQuery.finalize();
    createFunctionFileQuery.finalize();
    db.close();
  }

  async #connectDB() {
    return await api.db.connect(
      join(this.configuration.name, PROJECT_DB_PATH),
    );
  }
}

async function writeFunctionFile(path: string, code: string) {
  await api.fs.mkdir(dirname(path), { recursive: true });
  await api.fs.writeTextFile(path, code, { createNew: true });
}

export { ProjectBuilder };
