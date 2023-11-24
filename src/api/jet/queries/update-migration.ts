export const updateMigrationMutation = `
  mutation updateDraftMigration($input: UpdateDraftMigrationInput!) {
    updateDraftMigration(input: $input) {
      draftMigration {
        version
      }
    }
  }
`;
