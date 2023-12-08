export const deleteMigrationMutation = `
  mutation databaseDeleteDraftMigration(
    $projectId: UUID!,
    $migrationVersion: Int!,
  ) {
    databaseDeleteDraftMigration(input: { projectId: $projectId, migrationVersion: $migrationVersion}) {
      draftMigration {
        version
      }
    }
  }
`;
