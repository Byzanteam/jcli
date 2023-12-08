export const commitMutation = `
  mutation projectsCommit(
    $projectId: UUID!,
    $message: String,
    $hash: String!
  ) {
    projectsCommit(input: { projectId: $projectId, message: $message, hash: $hash }) {
      commit {
        id
      }
    }
  }
`;
