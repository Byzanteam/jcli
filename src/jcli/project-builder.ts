import { Confirm } from "@cliffy/prompt/confirm";
import { dirname, join } from "path";

import { api, PROJECT_ASSETS_DIRECTORY, PROJECT_DB_PATH } from "@/api/mod.ts";
import { createConfigurationQuery } from "@/api/db/queries/create-configuration.ts";
import { createFunctionsQuery } from "@/api/db/queries/create-functions.ts";
import { createMetadataQuery } from "@/api/db/queries/create-metadata.ts";
import { createTableObjectsQuery } from "@/api/db/queries/create-table-objects.ts";
import { createWorkflowsQuery } from "@/api/db/queries/create-workflows.ts";

import { WorkflowDraftWorkflow } from "@/jet/workflow.ts";
import { Config } from "@/jcli/config/config.ts";
import {
  ProjectDotJSON,
  projectDotJSONPath,
} from "@/jcli/config/project-json.ts";

interface BuilderOptions {
  force?: boolean;
}

interface FunctionFile {
  path: string;
  hash: string;
  code: Uint8Array;
}

abstract class BaseBuilder {
  protected configuration: ProjectDotJSON;
  protected directory: string;
  protected options: BuilderOptions;

  constructor(
    configuration: ProjectDotJSON,
    directory: string,
    options: BuilderOptions,
  ) {
    this.configuration = configuration;
    this.directory = directory;
    this.options = options;
  }

  get DbPath(): string {
    return join(this.directory, PROJECT_DB_PATH);
  }

  abstract provisionFiles(): Promise<void>;
  abstract provisionDatabases(): void;
  abstract buildMetadata(projectId: string): Promise<void>;
  abstract buildFunctions(
    functions: AsyncIterable<{
      name: string;
      files: ReadonlyArray<FunctionFile>;
    }>,
  ): Promise<void>;
  abstract buildMigrations(
    migrations: AsyncIterable<{
      version: number;
      name: string | null;
      hash: string;
      content: string;
    }>,
  ): Promise<void>;
  abstract buildWorkflows(
    workflows: AsyncIterable<{ name: string; hash: string }>,
  ): Promise<void>;

  protected buildVersionString(version: number): string {
    const versionStr = version.toString();

    if (versionStr.length > 12) {
      throw new Error(
        "Version string is too long. Expected 12 digits, got: ${version}",
      );
    } else {
      return versionStr.padStart(12, "0");
    }
  }

  protected async connectDB() {
    return await api.db.connect(this.DbPath);
  }
}

class DatabaseBuilder extends BaseBuilder {
  constructor(
    configuration: ProjectDotJSON,
    directory: string,
    options: BuilderOptions,
  ) {
    super(configuration, directory, options);
  }

  async provisionFiles(): Promise<void> {
    const directory = join(this.directory, PROJECT_ASSETS_DIRECTORY);

    await api.fs.mkdir(directory).catch((err) => {
      if (err instanceof Deno.errors.AlreadyExists) {
        return;
      }

      throw err;
    });

    await api
      .fs
      .lstat(this.DbPath)
      .catch((err) => {
        if (err instanceof Deno.errors.NotFound) {
          return err;
        }

        throw err;
      }).then(async (file) => {
        if (file instanceof Deno.errors.NotFound) return;

        let force = this.options.force;

        if (force === undefined) {
          force = await Confirm.prompt({
            message:
              `The database file "${this.DbPath}" already exists. Do you want to overwrite it?`,
            default: false,
          });
        }

        if (force) {
          await api.fs.remove(this.DbPath);
        } else {
          throw new Deno.errors.AlreadyExists(
            `The database file "${this.DbPath}" already exists.`,
          );
        }
      });
  }

  provisionDatabases(): void {
    const db = api.db.createDatabase(this.DbPath);

    db.execute(createMetadataQuery);
    db.execute(createTableObjectsQuery);
    db.execute(createFunctionsQuery);
    db.execute(createWorkflowsQuery);
    db.execute(createConfigurationQuery);

    db.query<never>("INSERT INTO configuration (data) VALUES (:data);", {
      data: JSON.stringify(this.configuration.toJSON()),
    });

    db.close();
  }

  async buildMetadata(projectId: string) {
    const db = await this.connectDB();

    db.query("INSERT INTO metadata (project_id) VALUES (:projectId)", {
      projectId,
    });

    db.close();
  }

  async buildFunctions(
    functions: AsyncIterable<{
      name: string;
      files: ReadonlyArray<FunctionFile>;
    }>,
  ) {
    const db = await this.connectDB();

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

      for (const { path, hash } of func.files) {
        const filePath = join("functions", func.name, path);

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

  async buildMigrations(
    migrations: AsyncIterable<{
      version: number;
      name: string | null;
      hash: string;
      content: string;
    }>,
  ) {
    const db = await this.connectDB();

    const createMigrationQuery = db.prepareQuery<
      never,
      never,
      { path: string; hash: string }
    >(
      "INSERT INTO objects (path, hash, filetype) VALUES (:path, :hash, 'MIGRATION')",
    );

    for await (const { version, name, hash } of migrations) {
      const versionStr = this.buildVersionString(version);

      const path = name
        ? join("migrations", `${versionStr}_${name}.sql`)
        : join("migrations", `${versionStr}.sql`);

      createMigrationQuery.execute({ path, hash });
    }

    createMigrationQuery.finalize();
    db.close();
  }

  async buildWorkflows(
    workflows: AsyncIterable<WorkflowDraftWorkflow>,
  ): Promise<void> {
    const db = await this.connectDB();
    const createWorkflowQuery = db.prepareQuery<
      never,
      never,
      { name: string; hash: string }
    >("INSERT INTO workflows (name, hash) VALUES (:name, :hash)");
    for await (const workflow of workflows) {
      createWorkflowQuery.execute({ name: workflow.name, hash: workflow.hash });
    }
    createWorkflowQuery.finalize();
    db.close();
  }
}

class FileBuilder extends BaseBuilder {
  constructor(
    configuration: ProjectDotJSON,
    directory: string,
    options: BuilderOptions,
  ) {
    super(configuration, directory, options);
  }

  async provisionFiles(): Promise<void> {
    const directory = join(this.directory, PROJECT_ASSETS_DIRECTORY);

    await api.fs.mkdir(this.directory);
    await api.fs.mkdir(directory);
    await api.fs.mkdir(join(directory, "functions"));
    await api.fs.mkdir(join(directory, "migrations"));
    await api.fs.mkdir(join(directory, "workflows"));

    const projectDotJSON = new Config<ProjectDotJSON>(
      projectDotJSONPath(this.directory),
    );

    await projectDotJSON.set(this.configuration, { createNew: true });
  }

  provisionDatabases(): void {
    const db = api.db.createDatabase(this.DbPath);

    db.execute(createMetadataQuery);
    db.execute(createTableObjectsQuery);
    db.execute(createFunctionsQuery);
    db.execute(createWorkflowsQuery);
    db.execute(createConfigurationQuery);

    db.query<never>("INSERT INTO configuration (data) VALUES (:data);", {
      data: JSON.stringify(this.configuration.toJSON()),
    });

    db.close();
  }

  async buildMetadata(projectId: string) {
    const db = await this.connectDB();

    db.query("INSERT INTO metadata (project_id) VALUES (:projectId)", {
      projectId,
    });

    db.close();
  }

  async buildFunctions(
    functions: AsyncIterable<{
      name: string;
      files: ReadonlyArray<FunctionFile>;
    }>,
  ) {
    const db = await this.connectDB();

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
        const file = join("functions", func.name, path);

        await writeFunctionFile(this.directory, file, code);
        createFunctionFileQuery.execute({ path: file, hash });
      }
    }

    createFunctionQuery.finalize();
    createFunctionFileQuery.finalize();
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
    const db = await this.connectDB();

    const createMigrationQuery = db.prepareQuery<
      never,
      never,
      { path: string; hash: string }
    >(
      "INSERT INTO objects (path, hash, filetype) VALUES (:path, :hash, 'MIGRATION')",
    );

    for await (const { version, name, hash, content } of migrations) {
      const versionStr = this.buildVersionString(version);
      const path = name
        ? join("migrations", `${versionStr}_${name}.sql`)
        : join("migrations", `${versionStr}.sql`);
      const file = join(this.directory, PROJECT_ASSETS_DIRECTORY, path);

      await api.fs.writeTextFile(file, content, { createNew: true });
      createMigrationQuery.execute({ path, hash });
    }

    createMigrationQuery.finalize();
    db.close();
  }

  async buildWorkflows(
    workflows: AsyncIterable<WorkflowDraftWorkflow>,
  ): Promise<void> {
    const db = await this.connectDB();
    const createWorkflowQuery = db.prepareQuery<
      never,
      never,
      { name: string; hash: string }
    >(
      "INSERT INTO workflows (name, hash) VALUES (:name, :hash)",
    );

    for await (const { name, data, hash } of workflows) {
      const directory = join(this.directory, PROJECT_ASSETS_DIRECTORY);
      const file = join(directory, "workflows", `${name}.json`);
      const definition = JSON.stringify({ name, ...data }, null, 2);
      await api.fs.writeTextFile(file, definition, { createNew: true });

      createWorkflowQuery.execute({ name, hash });
    }

    createWorkflowQuery.finalize();
    db.close();
  }
}

class ProjectBuilder {
  private builder: BaseBuilder;

  constructor(
    configuration: ProjectDotJSON,
    options?: { directory?: string; onlyDb?: boolean; force?: boolean },
  ) {
    const directory = options?.directory ?? configuration.name;
    const builderOptions: BuilderOptions = { force: options?.force };
    this.builder = options?.onlyDb
      ? new DatabaseBuilder(configuration, directory, builderOptions)
      : new FileBuilder(configuration, directory, builderOptions);
  }

  async provisionFiles(): Promise<void> {
    await this.builder.provisionFiles();
  }

  provisionDatabases(): void {
    this.builder.provisionDatabases();
  }

  async buildMetadata(projectId: string) {
    await this.builder.buildMetadata(projectId);
  }

  async buildFunctions(
    functions: AsyncIterable<{
      name: string;
      files: ReadonlyArray<FunctionFile>;
    }>,
  ): Promise<void> {
    await this.builder.buildFunctions(functions);
  }

  async buildMigrations(
    migrations: AsyncIterable<{
      version: number;
      name: string | null;
      hash: string;
      content: string;
    }>,
  ): Promise<void> {
    await this.builder.buildMigrations(migrations);
  }

  async buildWorkflows(
    workflows: AsyncIterable<{ name: string; hash: string }>,
  ): Promise<void> {
    await this.builder.buildWorkflows(workflows);
  }
}

async function writeFunctionFile(
  directory: string,
  path: string,
  code: Uint8Array,
) {
  const file = join(directory, PROJECT_ASSETS_DIRECTORY, path);

  await api.fs.mkdir(dirname(file), { recursive: true });
  await api.fs.writeFile(file, code, { createNew: true });
}

export { ProjectBuilder };
