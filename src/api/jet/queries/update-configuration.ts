export const updateConfigurationMutation = `
  mutation updateDraftConfiguration(
    $projectUuid: UUID!,
    $commands: CamelizedObjectJSON!
  ) {
    updateDraftConfiguration(input: { projectUuid: $projectUuid, commands: $commands }) {
      project {
        uuid
      }
    }
  }
`;
