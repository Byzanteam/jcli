export const createTableFileHashesQuery = `
  CREATE TABLE file_hashes (
    path TEXT PRIMARY KEY,
    hash BLOB
  );
`;
