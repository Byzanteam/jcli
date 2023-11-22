export const createMigrationMutation = `
  mutation createDraftMigration(
    $projectUuid: UUID!,
    $version: Int!,
    $name: String,
    $content: String!,
  ) {
    createDraftMigration(input: { projectUuid: $projectUuid, version: $version, name: $name, content: $content}) {
      draftMigration {
        version
      }
    }
  }
`;
