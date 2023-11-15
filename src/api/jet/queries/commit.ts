export const commitMutation = `
  mutation commit(
    $projectUuid: UUID!,
    $message: String,
    $expectedProjectHash: String!,
  ) {
    commit(input: { projectUuid: $projectUuid, message: $message, expectedProjectHash: }) {
      uuid
    }
  }
`;
