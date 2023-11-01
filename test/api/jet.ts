import { Jet } from "@/api/jet.ts";
import { Project } from "@/jet/project.ts";

interface ProjectQuery {
  projectName?: string;
  projectId?: string;
}

export interface ProjectObject {
  id: string;
  name: string;
  title: string;
}

export interface MigrationObject {
  projectUuid: string;
  version: number;
  content: string;
}

export interface JetTest extends Jet {
  hasProject(query: ProjectQuery): boolean;
  getProject(query: ProjectQuery): ProjectObject | undefined;
  getMigrations(projectUuid: string): Map<number, MigrationObject> | undefined;
}

export function makeJet(): JetTest {
  const projectNameIdMappings = new Map<string, string>();
  const projects = new Map<string, ProjectObject>();

  const projectMigrations = new Map<
    string,
    Map<number, MigrationObject>
  >();

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
          resolve({ id, name, title, capabilities: [], instances: [] });
        } else {
          reject(new Error(`Project ${name} has already exist.`));
        }
      });
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

    getMigrations(projectUuid): Map<number, MigrationObject> | undefined {
      return projectMigrations.get(projectUuid);
    },
  };
}
