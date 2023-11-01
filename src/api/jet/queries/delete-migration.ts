export const deleteMigrationMutation = `
  mutation deleteDraftMigration(
    $projectUuid: UUID!,
    $migrationVersion: Int!,
  ) {
    deleteDraftMigration(input: { projectUuid: $projectUuid, migrationVersion: $migrationVersion}) {
      draftMigration {
        version
      }
    }
  }
`;
