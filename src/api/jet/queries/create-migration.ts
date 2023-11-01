export const createMigrationMutation = `
  mutation createDraftMigration(
    $projectUuid: UUID!,
    $version: Int!,
    $content: String!,
  ) {
    createDraftMigration(input: { projectUuid: $projectUuid, version: $version, content: $content}) {
      draftMigration {
        version
      }
    }
  }
`;
