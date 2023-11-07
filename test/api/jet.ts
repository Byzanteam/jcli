import { parse } from "path";

import { Jet } from "@/api/mod.ts";
import { Project } from "@/jet/project.ts";

import { FSTest, makeFS } from "@test/api/mod.ts";

interface ProjectQuery {
  projectName?: string;
  projectId?: string;
}

export interface ProjectObject {
  id: string;
  name: string;
  title: string;
}

export interface FunctionObject {
  projectUuid: string;
  name: string;
  title: string;
  files: FSTest;
}

export interface MigrationObject {
  projectUuid: string;
  version: number;
  content: string;
}

export interface JetTest extends Jet {
  hasProject(query: ProjectQuery): boolean;
  getProject(query: ProjectQuery): ProjectObject | undefined;
  getFunctions(projectUuid: string): Map<string, FunctionObject> | undefined;
  getMigrations(projectUuid: string): Map<number, MigrationObject> | undefined;
}

export function makeJet(): JetTest {
  const projectNameIdMappings = new Map<string, string>();
  const projects = new Map<string, ProjectObject>();

  const projectFunctions = new Map<string, Map<string, FunctionObject>>();

  const projectMigrations = new Map<
    string,
    Map<number, MigrationObject>
  >();

  const tryMkdirRecursively = async (
    path: string,
    fs: FSTest,
  ): Promise<void> => {
    try {
      return await fs.mkdir(path, { recursive: true });
    } catch {
      return;
    }
  };

  const getProjectByName = (projectName: string): ProjectObject | undefined => {
    const projectId = projectNameIdMappings.get(projectName);

    if (undefined !== projectId) {
      return projects.get(projectId);
    }
  };

  return {
    createProject({ name, title }): Promise<Project> {
      return new Promise((resolve, reject) => {
        if (!projectNameIdMappings.has(name)) {
          const id = crypto.randomUUID();
          projectNameIdMappings.set(name, id);
          projects.set(id, { id, name, title: name });
          projectMigrations.set(id, new Map());
          projectFunctions.set(id, new Map());
          resolve({ id, name, title, capabilities: [], instances: [] });
        } else {
          reject(new Error(`Project ${name} has already exist.`));
        }
      });
    },

    createFunction({ projectUuid, name, title }): Promise<void> {
      return new Promise((resolve, reject) => {
        const functions = projectFunctions.get(projectUuid);

        if (functions && !functions.has(name)) {
          functions.set(name, { projectUuid, name, title, files: makeFS() });
          resolve();
        }

        reject(new Error("Cannot create function"));
      });
    },

    deleteFunction({ projectUuid, functionName }): Promise<void> {
      const func = projectFunctions.get(projectUuid)?.get(functionName);

      if (func) {
        const functions = projectFunctions.get(projectUuid);
        functions!.delete(functionName);
      }

      return Promise.resolve();
    },

    createFunctionFile({ projectUuid, functionName, path, code }) {
      return new Promise((resolve, reject) => {
        const func = projectFunctions.get(projectUuid)?.get(functionName);

        if (func) {
          if (func.files.hasFile(path)) {
            reject(new Error("File already exists"));
          }

          const { dir, base } = parse(path);

          if ("" === dir || "/" === dir) {
            func.files.writeTextFile(base, code, { createNew: true });
            resolve();
          } else {
            tryMkdirRecursively(dir, func.files).then(() => {
              func.files.writeTextFile(path, code, { createNew: true });
              resolve();
            });
          }
        } else {
          reject(new Error("Function not found"));
        }
      });
    },

    updateFunctionFile(
      { projectUuid, functionName, path, code },
    ): Promise<void> {
      return new Promise((resolve, reject) => {
        const func = projectFunctions.get(projectUuid)?.get(functionName);

        if (func) {
          if (!func.files.hasFile(path)) {
            reject(new Error("File not found"));
          } else {
            func.files.writeTextFile(path, code);
            resolve();
          }
        } else {
          reject(new Error("Function not found"));
        }
      });
    },

    deleteFunctionFile({ projectUuid, functionName, path }): Promise<void> {
      const func = projectFunctions.get(projectUuid)?.get(functionName);

      if (func?.files.hasFile(path)) {
        func.files.remove(path);
      }

      return Promise.resolve();
    },

    createMigration({ projectUuid, version, content }): Promise<void> {
      return new Promise((resolve, reject) => {
        const migrations = projectMigrations.get(projectUuid);

        if (migrations && !migrations.has(version)) {
          migrations.set(version, { projectUuid, version, content });
          resolve();
        }

        reject(new Error("Cannot create migration"));
      });
    },

    updateMigration({ projectUuid, migrationVersion, content }): Promise<void> {
      return new Promise((resolve, reject) => {
        const migration = projectMigrations.get(projectUuid)?.get(
          migrationVersion,
        );

        if (!migration) {
          reject(new Error("Migration not found"));
        }

        migration!.content = content;

        resolve();
      });
    },

    deleteMigration({ projectUuid, migrationVersion }): Promise<void> {
      const migration = projectMigrations.get(projectUuid)?.get(
        migrationVersion,
      );

      if (migration) {
        const migrations = projectMigrations.get(projectUuid);
        migrations!.delete(migrationVersion);
      }

      return Promise.resolve();
    },

    hasProject({ projectName, projectId }): boolean {
      if (undefined !== projectName) {
        return projectNameIdMappings.has(projectName);
      } else if (undefined !== projectId) {
        return projects.has(projectId);
      } else {
        throw new Error("invalid query");
      }
    },

    getProject({ projectName, projectId }): ProjectObject | undefined {
      if (undefined !== projectName) {
        return getProjectByName(projectName);
      } else if (undefined !== projectId) {
        return projects.get(projectId);
      } else {
        throw new Error("invalid query");
      }
    },

    getFunctions(projectUuid): Map<string, FunctionObject> | undefined {
      return projectFunctions.get(projectUuid);
    },

    getMigrations(projectUuid): Map<number, MigrationObject> | undefined {
      return projectMigrations.get(projectUuid);
    },
  };
}
