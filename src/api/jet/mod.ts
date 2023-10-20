import { Project } from "@/jet/project.ts";
import { CreateProjectArgs } from "@/api/jet.ts";
import { JcliConfigDotJSON } from "@/jcli/config/jcli-config-json.ts";

import {
  createProjectMutation,
  CreateProjectMutationResponse,
} from "@/api/jet/queries/create-project.ts";

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

  return resolveResponse(body);
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
  const response = await query<CreateProjectMutationResponse>(
    createProjectMutation,
    args,
    config,
  );

  return {
    id: response.createProject.project.uuid,
    name: response.createProject.project.name,
    title: response.createProject.project.title,
    capabilities: [],
    instances: [],
  };
}
