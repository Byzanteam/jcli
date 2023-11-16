export const deployMutation = `
  mutation deploy(
    $projectUuid: UUID!,
    $commitId: String
  ) {
    deployment(input: { projectUuid: $projectUuid, commitId: $commitId }) {
      uuid
    }
  }
`;
