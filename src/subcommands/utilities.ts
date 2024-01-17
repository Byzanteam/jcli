import { api } from "@/api/mod.ts";

export async function provisionProjectDirectories(projectName: string) {
  await api.fs.mkdir(projectName);
  await api.fs.mkdir(`${projectName}/migrations`);
  await api.fs.mkdir(`${projectName}/functions`);
  await api.fs.mkdir(`${projectName}/.jcli`);
}
