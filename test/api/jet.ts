import { parse } from "path";

import {
  Deployment,
  DeploymentLog,
  Jet,
  JetProject,
  ProjectEnvironmentName,
} from "@/api/mod.ts";
import { Project } from "@/jet/project.ts";

import { FSTest, makeFS } from "@test/api/mod.ts";
import { ProjectDotJSON, ProjectPatch } from "@/jcli/config/project-json.ts";

import { digest } from "@/jcli/file/project.ts";
import { listFilesRec } from "@/jcli/file/files-man.ts";

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
  projectId: string;
  name: string;
  title: string;
  files: FSTest;
}

export interface MigrationObject {
  projectId: string;
  version: number;
  name: string | null;
  content: string;
}

export interface CommitRequest {
  message?: string;
  hash: string;
}

export interface DeployRequest {
  commitId?: string;
}

export interface PluginInstanceRequest {
  projectId: string;
  instanceName: string;
  environmentName: ProjectEnvironmentName;
}

export interface JetTest extends Jet {
  hasProject(query: ProjectQuery): boolean;
  getProject(query: ProjectQuery): ProjectObject | undefined;
  getConfigurationPatches(projectId: string): Array<ProjectPatch> | undefined;
  getFunctions(projectId: string): Map<string, FunctionObject> | undefined;
  getMigrations(projectId: string): Map<number, MigrationObject> | undefined;
  getDeployDraftFunctionsRequests(projectId: string): number | undefined;
  getCommitRequests(
    projectId: string,
  ): ReadonlyArray<CommitRequest> | undefined;
  getDeployRequests(
    projectId: string,
  ): ReadonlyArray<DeployRequest> | undefined;
  getEnvironmentVariables(
    projectId: string,
    environmentName: ProjectEnvironmentName,
  ): Map<string, string> | undefined;
  getPluginInstallRequests(
    projectId: string,
  ): ReadonlyArray<PluginInstanceRequest> | undefined;
  setDeploymentLogs(
    projectId: string,
    environmentName: ProjectEnvironmentName,
    logs: ReadonlyArray<DeploymentLog>,
  ): void;
  setDeployment(
    projectId: string,
    environmentName: ProjectEnvironmentName,
    functionName: string,
    deployment: Deployment,
  ): void;
}

export function makeJet(): JetTest {
  const projectNameIdMappings = new Map<string, string>();
  const projects = new Map<string, ProjectObject>();

  const projectConfigurationPatches: Array<ProjectPatch> = [];

  const projectFunctions = new Map<string, Map<string, FunctionObject>>();

  const deployDraftFunctionsRequests = new Map<string, number>();

  const projectMigrations = new Map<
    string,
    Map<number, MigrationObject>
  >();

  const projectExecutedMigrations = new Map<string, Array<number>>();

  const commitRequests = new Map<string, Array<CommitRequest>>();

  const deployRequests = new Map<string, Array<DeployRequest>>();

  const environmentVariables = new Map<
    string,
    Map<ProjectEnvironmentName, Map<string, string>>
  >();

  const pluginInstances = new Map<string, Array<PluginInstanceRequest>>();

  const deploymentLogs = new Map<
    string,
    Map<ProjectEnvironmentName, Array<DeploymentLog>>
  >();

  const deployments = new Map<
    string,
    Map<ProjectEnvironmentName, Map<string, Deployment>>
  >();

  const tryMkdirRecursively = async (
    path: string,
    fs: FSTest,
  ): Promise<void> => {
    try {
      await fs.mkdir(path, { recursive: true });
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
          projectExecutedMigrations.set(id, []);
          projectFunctions.set(id, new Map());
          deployDraftFunctionsRequests.set(id, 0);
          commitRequests.set(id, []);
          deployRequests.set(id, []);
          environmentVariables.set(
            id,
            new Map([["DEVELOPMENT", new Map()], ["PRODUCTION", new Map()]]),
          );

          const logs = new Map<ProjectEnvironmentName, Array<DeploymentLog>>();
          logs.set("DEVELOPMENT", []);
          logs.set("PRODUCTION", []);
          deploymentLogs.set(id, logs);

          const projDeployments = new Map<
            ProjectEnvironmentName,
            Map<string, Deployment>
          >();
          projDeployments.set("DEVELOPMENT", new Map<string, Deployment>());
          projDeployments.set("PRODUCTION", new Map<string, Deployment>());
          deployments.set(id, projDeployments);

          resolve({ id, name, title, capabilities: [], instances: [] });
        } else {
          reject(new Error(`Project ${name} has already exist.`));
        }
      });
    },

    updateConfiguration({ projectId, command }): Promise<void> {
      return new Promise((resolve, reject) => {
        if (projects.has(projectId)) {
          projectConfigurationPatches.push(command);
          resolve();
        } else {
          reject(new Error("Project not found"));
        }
      });
    },

    createFunction({ projectId, name, title }): Promise<void> {
      return new Promise((resolve, reject) => {
        const functions = projectFunctions.get(projectId);

        if (functions && !functions.has(name)) {
          functions.set(name, { projectId, name, title, files: makeFS() });
          resolve();
        }

        reject(new Error("Cannot create function"));
      });
    },

    deleteFunction({ projectId, functionName }): Promise<void> {
      const func = projectFunctions.get(projectId)?.get(functionName);

      if (func) {
        const functions = projectFunctions.get(projectId);
        functions!.delete(functionName);
      }

      return Promise.resolve();
    },

    deployDraftFunctions({ projectId }): Promise<void> {
      return new Promise((resolve, reject) => {
        const count = deployDraftFunctionsRequests.get(projectId);

        if (undefined === count) {
          reject(new Error("Project not found"));
        } else {
          deployDraftFunctionsRequests.set(projectId, count + 1);
          resolve();
        }
      });
    },

    async createFunctionFile({ projectId, functionName, path, code }) {
      const func = projectFunctions.get(projectId)?.get(functionName);

      if (func) {
        if (func.files.hasFile(path)) {
          throw new Error("File already exists");
        }

        const { dir, base } = parse(path);

        if ("" === dir || "/" === dir) {
          await func.files.writeTextFile(base, code, { createNew: true });
        } else {
          await tryMkdirRecursively(dir, func.files);
          await func.files.writeTextFile(path, code, {
            createNew: true,
          });
        }
      } else {
        throw new Error("Function not found");
      }
    },

    async updateFunctionFile(
      { projectId, functionName, path, code },
    ): Promise<void> {
      const func = projectFunctions.get(projectId)?.get(functionName);

      if (func) {
        if (!func.files.hasFile(path)) {
          throw new Error("File not found");
        } else {
          await func.files.writeTextFile(path, code);
        }
      } else {
        throw new Error("Function not found");
      }
    },

    async deleteFunctionFile(
      { projectId, functionName, path },
    ): Promise<void> {
      const func = projectFunctions.get(projectId)?.get(functionName);

      if (func?.files.hasFile(path)) {
        await func.files.remove(path);
      }
    },

    createMigration({ projectId, version, name, content }): Promise<void> {
      return new Promise((resolve, reject) => {
        const migrations = projectMigrations.get(projectId);

        if (migrations && !migrations.has(version)) {
          migrations.set(version, { projectId, version, name, content });
          resolve();
        }

        reject(new Error("Cannot create migration"));
      });
    },

    updateMigration(args): Promise<void> {
      const { projectId, migrationVersion } = args;

      return new Promise((resolve, reject) => {
        const migration = projectMigrations.get(projectId)?.get(
          migrationVersion,
        );

        if (!migration) {
          reject(new Error("Migration not found"));
        }

        if (undefined !== args.content) {
          migration!.content = args.content;
        }

        if (undefined !== args.name) {
          migration!.name = args.name;
        }

        resolve();
      });
    },

    deleteMigration({ projectId, migrationVersion }): Promise<void> {
      const migration = projectMigrations.get(projectId)?.get(
        migrationVersion,
      );

      if (migration) {
        const migrations = projectMigrations.get(projectId);
        migrations!.delete(migrationVersion);
      }

      return Promise.resolve();
    },

    migrateDB({ projectId }): Promise<void> {
      return new Promise((resolve, reject) => {
        const migrations = projectMigrations.get(projectId);

        if (!migrations) reject(new Error("Project not found"));

        const executedMigrations = projectExecutedMigrations.get(
          projectId,
        )!;

        let migrationsToExecute: Array<number>;

        if (0 === executedMigrations.length) {
          migrationsToExecute = Array.from(migrations!.keys());
        } else {
          const latestVersion =
            executedMigrations[executedMigrations.length - 1];

          migrationsToExecute = Array.from(migrations!.keys()).filter((e) =>
            e > latestVersion
          );
        }

        for (const version of migrationsToExecute.sort()) {
          executedMigrations.push(version);
        }

        resolve();
      });
    },

    rollbackDB({ projectId }): Promise<void> {
      return new Promise((resolve, reject) => {
        const executedMigrations = projectExecutedMigrations.get(projectId);

        if (undefined === executedMigrations) {
          reject(new Error("Project not found"));
        } else {
          executedMigrations.pop();
          resolve();
        }
      });
    },

    listMigrations({ projectId }): Promise<Array<number>> {
      return new Promise((resolve, reject) => {
        const executedMigrations = projectExecutedMigrations.get(projectId);

        if (undefined === executedMigrations) {
          reject(new Error("Project not found"));
        } else {
          resolve(executedMigrations);
        }
      });
    },

    configurationHash({ configuration }): Promise<string> {
      return digest(configuration);
    },

    commit({ projectId, message, hash }): Promise<void> {
      return new Promise((resolve, reject) => {
        const requests = commitRequests.get(projectId);

        if (undefined === requests) {
          reject(new Error("Project not found"));
        } else {
          requests.push({ message, hash });
          resolve();
        }
      });
    },

    deploy({ projectId, commitId }): Promise<void> {
      return new Promise((resolve, reject) => {
        const requests = deployRequests.get(projectId);

        if (undefined === requests) {
          reject(new Error("Project not found"));
        } else {
          requests.push({ commitId });
          resolve();
        }
      });
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

    getConfigurationPatches(
      projectId: string,
    ): Array<ProjectPatch> | undefined {
      if (projects.has(projectId)) {
        return projectConfigurationPatches;
      }
    },

    getFunctions(projectId: string): Map<string, FunctionObject> | undefined {
      return projectFunctions.get(projectId);
    },

    getMigrations(
      projectId: string,
    ): Map<number, MigrationObject> | undefined {
      return projectMigrations.get(projectId);
    },

    getDeployDraftFunctionsRequests(projectId) {
      return deployDraftFunctionsRequests.get(projectId);
    },

    getCommitRequests(projectId: string): Array<CommitRequest> | undefined {
      return commitRequests.get(projectId);
    },

    getDeployRequests(projectId: string): Array<DeployRequest> | undefined {
      return deployRequests.get(projectId);
    },

    setEnvironmentVariable(
      { projectId, environmentName, name, value },
    ): Promise<void> {
      return new Promise((resolve, reject) => {
        const variables = environmentVariables.get(projectId);

        if (undefined === variables) {
          reject(new Error("Project not found"));
        } else {
          variables.get(environmentName)!.set(name, value);
          resolve();
        }
      });
    },

    unsetEnvironmentVariable(
      { projectId, environmentName, name },
    ): Promise<void> {
      return new Promise((resolve, reject) => {
        const variables = environmentVariables.get(projectId);

        if (undefined === variables) {
          reject(new Error("Project not found"));
        } else {
          if (variables.get(environmentName)!.delete(name)) {
            resolve();
          } else {
            reject(new Error("Variable not found"));
          }
        }
      });
    },

    listEnvironmentVariables(
      { projectId, environmentName },
    ): Promise<Array<{ name: string; value: string }>> {
      return new Promise((resolve, reject) => {
        const variables = environmentVariables.get(projectId);

        if (undefined === variables) {
          reject(new Error("Project not found"));
        } else {
          resolve(
            Array.from(variables.get(environmentName)!).map(([name, value]) => {
              return { name, value };
            }),
          );
        }
      });
    },

    cloneProject({ projectId }): Promise<JetProject> {
      return new Promise((resolve, reject) => {
        const project = projects.get(projectId);

        if (!project) {
          reject(new Error("Project not found"));
        }

        async function* buildFunctionFiles(
          fs: FSTest,
        ): AsyncIterable<{ path: string; hash: string; code: string }> {
          for await (const path of listFilesRec("./", { fs })) {
            yield {
              path,
              hash: path,
              code: await fs.readTextFile(path),
            };
          }
        }

        async function* functions() {
          for (const [name, f] of projectFunctions.get(projectId)!.entries()) {
            yield {
              name,
              files: await Array.fromAsync(buildFunctionFiles(f.files)),
            };
          }
        }

        async function* migrations() {
          for (
            const { name, version, content } of projectMigrations.get(
              projectId,
            )!
              .values()
          ) {
            yield {
              version,
              name,
              hash: version.toString(),
              content,
            };
          }
        }

        resolve({
          name: project!.name,
          configuration: ProjectDotJSON.fromJSON(
            JSON.stringify({
              name: project!.name,
              title: project!.title,
              instances: [],
              capabilities: [],
            }),
          ),
          migrations: migrations(),
          functions: functions(),
        });
      });
    },

    getEnvironmentVariables(
      projectId,
      environmentName,
    ): Map<string, string> | undefined {
      return environmentVariables.get(projectId)?.get(environmentName);
    },

    pluginInstallInstance({
      projectId,
      instanceName,
      environmentName,
    }): Promise<void> {
      let requests = pluginInstances.get(projectId);
      if (!requests) {
        requests = [];
        pluginInstances.set(projectId, requests);
      }
      requests.push({ projectId, instanceName, environmentName });
      return Promise.resolve();
    },

    pluginUninstallInstance({
      projectId,
      instanceName,
      environmentName,
    }): Promise<void> {
      return new Promise((resolve, reject) => {
        const requests = pluginInstances.get(projectId);
        if (!requests) {
          reject(new Error("No plugin instances found for project"));
          return;
        }
        const index = requests.findIndex((request) =>
          request.instanceName === instanceName &&
          request.environmentName === environmentName
        );

        if (index === -1) {
          reject(new Error("Plugin instance not found"));
          return;
        }

        requests.splice(index, 1);
        resolve();
      });
    },

    getPluginInstallRequests(
      projectId: string,
    ): ReadonlyArray<PluginInstanceRequest> | undefined {
      return pluginInstances.get(projectId);
    },

    listDeploymentLogs(
      { projectId, environmentName, length, functionName },
    ): Promise<Array<DeploymentLog>> {
      return new Promise((resolve, reject) => {
        const logs = deploymentLogs.get(projectId)?.get(environmentName);

        if (!logs) {
          reject(new Error("Project not found"));
        } else {
          if (functionName) {
            resolve(
              logs.filter((log) => log.functionName === functionName).slice(
                0,
                length,
              ),
            );
          } else {
            resolve(logs.slice(0, length));
          }
        }
      });
    },

    listProjects(): Promise<Array<{ id: string; name: string }>> {
      return new Promise((resolve, reject) => {
        if (projects.size > 0) {
          resolve(
            Array.from(projects.values()).map((project) => ({
              id: project.id,
              name: project.name,
            })),
          );
        } else {
          reject(new Error("No projects found."));
        }
      });
    },

    setDeploymentLogs(
      projectId: string,
      environmentName: ProjectEnvironmentName,
      logs: Array<DeploymentLog>,
    ): void {
      deploymentLogs.get(projectId)?.set(environmentName, logs);
    },

    inspectFunction({ projectId, environmentName, functionName }) {
      return new Promise((resolve, reject) => {
        const deployment = deployments.get(projectId)?.get(environmentName)
          ?.get(functionName);

        if (!deployment) {
          reject(new Error("Deployment not found"));
        } else {
          resolve(deployment);
        }
      });
    },

    setDeployment(
      projectId: string,
      environmentName: ProjectEnvironmentName,
      functionName: string,
      deployment: Deployment,
    ): void {
      deployments.get(projectId)?.get(environmentName)?.set(
        functionName,
        deployment,
      );
    },
  };
}
