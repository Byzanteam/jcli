import { JcliConfigDotJSON } from "@/jcli/config/jcli-config-json.ts";

export async function query<T>(
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

export enum NodeType {
  "project" = "ProjectsProject",
}

export function buildNodeId(type: NodeType, id: string): string {
  return btoa(`${type}:${id}`);
}

export interface PageInfo {
  endCursor: string;
  hasNextPage: boolean;
}

export interface ConnectionIteratorOptions {
  perPage?: number;
}

const DEFAULT_PER_PAGE = 50;

export async function* connectionIterator<T, U>(
  query: (variables: { first: number; after?: string }) => Promise<T>,
  callback: (response: T) => { pageInfo: PageInfo; records: ReadonlyArray<U> },
  options?: ConnectionIteratorOptions,
): AsyncIterable<U> {
  let cursor: string | undefined;

  do {
    const response = await query({
      first: options?.perPage ?? DEFAULT_PER_PAGE,
      after: cursor,
    });
    const { pageInfo, records } = callback(response);

    yield* records;

    if (pageInfo.hasNextPage) {
      cursor = pageInfo.endCursor;
    } else {
      break;
    }
  } while (true);
}
