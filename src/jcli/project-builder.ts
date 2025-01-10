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
import { dirname, join } from "path";

abstract class BaseBuilder {
  protected configuration: ProjectDotJSON;
  protected directory: string;

  constructor(configuration: ProjectDotJSON, directory: string) {
    this.configuration = configuration;
    this.directory = directory;
  }

  abstract provisionFiles(): Promise<void>;
  abstract provisionDatabases(): void;
  abstract buildMetadata(projectId: string): Promise<void>;
  abstract buildFunctions(
    functions: AsyncIterable<{
      name: string;
      files: ReadonlyArray<{
        path: string;
        hash: string;
        code: string;
      }>;
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
    return await api.db.connect(join(this.directory, PROJECT_DB_PATH));
  }
}

class DatabaseBuilder extends BaseBuilder {
  constructor(configuration: ProjectDotJSON, directory: string) {
    super(configuration, directory);
  }

  async provisionFiles(): Promise<void> {
    const directory = join(this.directory, PROJECT_ASSETS_DIRECTORY);

    await api.fs.mkdir(directory);
  }

  provisionDatabases(): void {
    const db = api.db.createDatabase(`${this.directory}/${PROJECT_DB_PATH}`);

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
      files: ReadonlyArray<{
        path: string;
        hash: string;
        code: string;
      }>;
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
  constructor(configuration: ProjectDotJSON, directory: string) {
    super(configuration, directory);
  }

  async provisionFiles(): Promise<void> {
    const directory = join(this.directory, PROJECT_ASSETS_DIRECTORY);

    await api.fs.mkdir(directory, { recursive: true });
    await api.fs.mkdir(join(directory, "functions"));
    await api.fs.mkdir(join(directory, "migrations"));
    await api.fs.mkdir(join(directory, "workflows"));

    const projectDotJSON = new Config<ProjectDotJSON>(
      projectDotJSONPath(this.directory),
    );

    await projectDotJSON.set(this.configuration, { createNew: true });
  }

  provisionDatabases(): void {
    const db = api.db.createDatabase(`${this.directory}/${PROJECT_DB_PATH}`);

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
      files: ReadonlyArray<{
        path: string;
        hash: string;
        code: string;
      }>;
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
    options?: { directory?: string; onlyDb?: boolean },
  ) {
    const directory = options?.directory ?? configuration.name;
    this.builder = options?.onlyDb
      ? new DatabaseBuilder(configuration, directory)
      : new FileBuilder(configuration, directory);
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
      files: ReadonlyArray<{
        path: string;
        hash: string;
        code: string;
      }>;
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
  code: string,
) {
  const file = join(directory, PROJECT_ASSETS_DIRECTORY, path);

  await api.fs.mkdir(dirname(file), { recursive: true });
  await api.fs.writeTextFile(file, code, { createNew: true });
}

export { ProjectBuilder };
