export const createFunctionMutation = `
  mutation createDraftFunction(
    $projectUuid: UUID!,
    $name: String!,
    $title: String!,
  ) {
    createDraftFunction(input: { projectUuid: $projectUuid, name: $name, title: $title}) {
      draftFunction {
        name
      }
    }
  }
`;
