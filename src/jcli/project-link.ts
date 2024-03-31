import { api } from "@/api/mod.ts";

export async function projectLink(directory: string) {
  await api.fs.rename(`${directory}/.jcli`, "./.jcli");
  await api.fs.remove(directory, { recursive: true });
}
