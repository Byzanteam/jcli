import {
  GHRError,
  GithubReleasesProvider,
  GithubReleasesUpgradeCommand,
} from "@polyseam/cliffy-provider-gh-releases";
import { dirname } from "path";

const getOsAssetMap = () => {
  const { os, arch } = Deno.build;
  const osSuffixMap: { [key: string]: string } = {
    linux: `${arch}-unknown-linux-gnu`,
    darwin: `${arch}-apple-darwin`,
  };

  if (!(os in osSuffixMap)) {
    throw new Error(`Unsupported operating system ${os}`);
  }

  return { [os]: `jcli-${osSuffixMap[os]}.tar.gz` };
};

const getDestinationDir = async (executableName: string) => {
  const command = new Deno.Command("which", {
    args: [executableName],
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout } = await command.output();
  const fullPath = new TextDecoder().decode(stdout);
  return dirname(fullPath.trim());
};

export default async function createUpgradeCommand(): Promise<
  GithubReleasesUpgradeCommand
> {
  const osAssetMap = getOsAssetMap();
  const destinationDir = await getDestinationDir("jcli");

  return new GithubReleasesUpgradeCommand({
    provider: new GithubReleasesProvider({
      repository: "byzanteam/jcli",
      destinationDir: destinationDir,
      osAssetMap: osAssetMap,
      onError: (error: GHRError) => {
        const exit_code = parseInt(`${error.code}`);
        console.error("Error occurred during upgrade:", error);
        Deno.exit(exit_code);
      },
      onComplete: (_info) => {
        Deno.exit(0);
      },
    }),
  });
}
