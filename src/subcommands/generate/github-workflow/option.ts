import { GlobalOptions } from "@/args.ts";

export type GithubWorkflowOptions = GlobalOptions & {
  output: string;
  name?: string;
  branches?: ReadonlyArray<string>;
  jcliVersion?: string;
  jetEndpoint: string;
  projectId: string;
  distDir?: string;
};
