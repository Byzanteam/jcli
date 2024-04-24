export const listProjectsQuery = `
  query ListAllProjects($first: Int!, $after: String) {
    projects(first: $first, after: $after) {
      nodes {
        ... on ProjectsProject {
          id
          name
        }
      }
      
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export interface ListProjectsQueryResponse {
  projects: {
    nodes: ReadonlyArray<{
      id: string;
      name: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}
