export const createTableObjectsQuery = `
  CREATE TABLE objects (
    path TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    filetype TEXT NOT NULL
  );
`;
