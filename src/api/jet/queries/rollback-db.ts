export const rollbackDBMutation = `
  mutation databaseRollback(
    $projectId: UUID!,
  ) {
    databaseRollback(input: { projectId: $projectId }) {
      lastMigratedVersion
    }
  }
`;
