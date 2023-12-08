export const migrateDBMutation = `
  mutation databaseMigrate(
    $projectId: UUID!,
  ) {
    databaseMigrate(input: { projectId: $projectId }) {
      lastMigratedVersion
    }
  }
`;
