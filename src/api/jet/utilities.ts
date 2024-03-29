import { JcliConfigDotJSON } from "@/jcli/config/jcli-config-json.ts";
import { getLogger } from "@/jcli/logger.ts";

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

  logRequest(query, variables, body);

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
  "environment" = "ProjectsEnvironment",
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

const MAXIMUM_PER_PAGE = 50;
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

export async function* fetchLength<T, U>(
  query: (variables: { first: number; after?: string }) => Promise<T>,
  callback: (response: T) => { pageInfo: PageInfo; records: ReadonlyArray<U> },
  length: number,
): AsyncIterable<U> {
  const requiredPages = Math.ceil(length / MAXIMUM_PER_PAGE);

  let cursor: string | undefined;
  let fetchedPages = 0;

  do {
    const response = await query({
      first: MAXIMUM_PER_PAGE,
      after: cursor,
    });
    const { pageInfo, records } = callback(response);

    fetchedPages++;

    if (fetchedPages === requiredPages) {
      yield* records.slice(0, length % MAXIMUM_PER_PAGE);
      break;
    } else {
      yield* records;

      if (pageInfo.hasNextPage) {
        cursor = pageInfo.endCursor;
      } else {
        break;
      }
    }
  } while (true);
}

function logRequest(query: string, variables: object, response: object) {
  const logger = getLogger();
  const message = `GraphQL request:
query: ${query}

variables: ${JSON.stringify(variables, null, 2)}

response: ${JSON.stringify(response, null, 2)}
`;

  logger.debug(message);
}
