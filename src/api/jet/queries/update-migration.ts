export const updateMigrationMutation = `
  mutation updateDraftMigration(
    $projectUuid: UUID!,
    $migrationVersion: Int!,
    $content: String!,
  ) {
    updateDraftMigration(input: { projectUuid: $projectUuid, migrationVersion: $migrationVersion, content: $content}) {
      draftMigration {
        version
      }
    }
  }
`;
