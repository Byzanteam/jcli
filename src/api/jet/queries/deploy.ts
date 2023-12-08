export const deployMutation = `
  mutation projectsCheckout(
    $projectId: UUID!,
    $commitId: UUID
  ) {
    projectsCheckout(input: { projectId: $projectId, commitId: $commitId }) {
      project {
        id
      }
    }
  }
`;
