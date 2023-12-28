export const setEnvironmentVariableMutation = `
  mutation projectsSetEnvironmentVariable(
    $projectId: UUID!
    $environmentName: ProjectsEnvironmentName!
    $name: String!
    $value: String!
  ) {
    projectsSetEnvironmentVariable(input: {
      projectId: $projectId,
      environmentName: $environmentName,
      name: $name,
      value: $value
    }) {
      environmentVariable {
        id
      }
    }
  }
`;
