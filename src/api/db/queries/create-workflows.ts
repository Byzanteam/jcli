export const createWorkflowsQuery = `
  CREATE TABLE workflows (
    name TEXT PRIMARY KEY,
    hash TEXT NOT NULL
  );
`;
