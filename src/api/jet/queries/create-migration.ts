export const createMigrationMutation = `
  mutation databaseCreateDraftMigration(
    $projectId: UUID!,
    $version: Int!,
    $name: String,
    $content: String!,
  ) {
    databaseCreateDraftMigration(input: { projectId: $projectId, version: $version, name: $name, content: $content}) {
      draftMigration {
        version
      }
    }
  }
`;
