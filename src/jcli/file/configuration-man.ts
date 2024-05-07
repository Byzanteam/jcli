import { Validator } from "jsonschema";
import { PreparedQuery } from "sqlite";
import { Statement } from "jsr:@db/sqlite@0.11";

import { Project } from "@/jet/project.ts";

import { api, DBClass } from "@/api/mod.ts";

import { Config } from "@/jcli/config/config.ts";
import {
  isPatchEmpty,
  ProjectDotJSON,
  projectDotJSONPath,
} from "@/jcli/config/project-json.ts";

import projectJSONSchema from "@schemas/project-file.v1.json" with {
  type: "json",
};

export interface PushConfigurationQueries {
  getConfigurationQuery(): ReadonlyArray<{ data: string }>;
  updateConfigurationQuery: Statement;
  finalize(): void;
}

export function prepareQueries(db: DBClass): PushConfigurationQueries {
  const updateConfigurationQuery = db.prepare(
    "UPDATE configuration SET data = :data",
  );

  return {
    getConfigurationQuery() {
      return db.prepare(
        "SELECT data FROM configuration",
      ).all();
    },
    updateConfigurationQuery,
    finalize() {
      updateConfigurationQuery.finalize();
    },
  };
}

export async function pushConfiguration(
  queries: PushConfigurationQueries,
  projectId: string,
): Promise<void> {
  const configWas = getConfigurationFromDB(queries);
  const config = await getConfigurationFromFile();
  const command = configWas.diff(config);

  if (!isPatchEmpty(command)) {
    await api.jet.updateConfiguration({ projectId, command });
    queries.updateConfigurationQuery.get({ data: JSON.stringify(config) });
  }
}

function getConfigurationFromDB(
  queries: PushConfigurationQueries,
): ProjectDotJSON {
  const result = queries.getConfigurationQuery();

  if (1 === result.length) {
    return ProjectDotJSON.fromJSON(result[0].data);
  } else {
    throw new Error("Failed to get configuration");
  }
}

function getConfigurationFromFile(): Promise<ProjectDotJSON> {
  const serializer = {
    serialize(config: ProjectDotJSON): Promise<string> {
      return Promise.resolve(JSON.stringify(config));
    },
    deserialize(rawData: string): Promise<ProjectDotJSON> {
      return new Promise((resolve, reject) => {
        const data = JSON.parse(rawData);
        const validator = new Validator();

        if (!validator.validate(data, projectJSONSchema).valid) {
          return reject(new Error("Invalid configuration"));
        }

        resolve(new ProjectDotJSON(data as Project));
      });
    },
  };

  const config = new Config<ProjectDotJSON>(projectDotJSONPath(), {
    serializer,
  });

  return config.get();
}
