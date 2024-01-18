export const configurationHashQuery = `
  query projectsConfigurationHash($configuration: ObjectJSON!) {
    projectsConfigurationHash(configuration: $configuration)
  }
`;

export interface ConfigurationHashQueryResponse {
  projectsConfigurationHash: string;
}
