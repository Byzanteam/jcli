export interface UpsertWorkflowQueryResponse {
  workflowsUpsertWorkflowDefinition: {
    workflowDefinition: {
      hash: string;
    };
  };
}

export const upsertWorkflowQuery = `
mutation UpsertWorkflow($projectId: UUID!, $params: ObjectJSON!) {
  workflowsUpsertWorkflowDefinition(input: {projectId: $projectId, params: $params}) {
    workflowDefinition {
      hash
    }
  }
}
`;
