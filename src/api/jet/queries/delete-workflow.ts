export const deleteWorkflowQuery = `
mutation deleteWorkflowDefinition(
  $projectId: UUID!
  $name: String!
) {
  workflowsDeleteWorkflowDefinition(input: {
    projectId: $projectId
    name: $name
  }) {
    workflowDefinition {
      id
    }
  }
}
`;
