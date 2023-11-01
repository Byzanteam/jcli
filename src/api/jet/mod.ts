import { Project } from "@/jet/project.ts";
import {
  CreateMigrationArgs,
  CreateProjectArgs,
  DeleteMigrationArgs,
  UpdateMigrationArgs,
} from "@/api/jet.ts";
import { JcliConfigDotJSON } from "@/jcli/config/jcli-config-json.ts";

import {
  createProjectMutation,
  CreateProjectMutationResponse,
} from "@/api/jet/queries/create-project.ts";

import { createMigrationMutation } from "@/api/jet/queries/create-migration.ts";
import { updateMigrationMutation } from "@/api/jet/queries/update-migration.ts";
import { deleteMigrationMutation } from "@/api/jet/queries/delete-migration.ts";

async function query<T>(
  query: string,
  variables: object,
  config: JcliConfigDotJSON,
): Promise<T> {
  const response = await fetch(config.jetEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await response.json();

  return resolveResponse<T>(body);
}

function resolveResponse<T>(
  body: { errors?: ReadonlyArray<{ message: string }>; data?: T },
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (body.errors) {
      reject(body.errors);
    } else if (body.data) {
      resolve(body.data);
    }
  });
}

export async function createProject(
  args: CreateProjectArgs,
  config: JcliConfigDotJSON,
): Promise<Project> {
  const { createProject: { project: { uuid, name, title } } } = await query<
    CreateProjectMutationResponse
  >(
    createProjectMutation,
    args,
    config,
  );

  return {
    id: uuid,
    name,
    title,
    capabilities: [],
    instances: [],
  };
}

export async function createMigration(
  args: CreateMigrationArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(createMigrationMutation, args, config);
}

export async function updateMigration(
  args: UpdateMigrationArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(updateMigrationMutation, args, config);
}

export async function deleteMigration(
  args: DeleteMigrationArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(deleteMigrationMutation, args, config);
}
