import { JcliConfigDotJSON } from "@/jcli/config/jcli-config-json.ts";
import { getLogger } from "@/jcli/logger.ts";

export async function query<T>(
  query: string,
  variables: object,
  config: JcliConfigDotJSON,
): Promise<T> {
  const logger = getLogger();
  const token = config?.authentications?.[config.jetEndpoint]?.token;
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (token) {
    headers.append("Authorization", `Basic ${token}`);
    logger.debug(`Authorization header is set for the request.`);
  }

  const response = await fetch(config.jetEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const body = await response.json();

  return resolveResponse<T>(query, variables, body);
}

function resolveResponse<T>(
  query: string,
  variables: object,
  body: { errors?: ReadonlyArray<{ message: string }>; data?: T },
): Promise<T> {
  const message = buildMessage(query, variables, body);

  return new Promise((resolve, reject) => {
    if (body.errors) {
      reject(new Error(message));
    } else if (body.data) {
      getLogger().debug(message);

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

function buildMessage(query: string, variables: object, body: object) {
  return `GraphQL request:
query: ${query}

variables: ${JSON.stringify(variables, null, 2)}

body: ${JSON.stringify(body, null, 2)}`;
}
