import { setupLogger } from "@/jcli/logger.ts";

export type GlobalOptions = {
  debug?: true;
};

export function action(options: GlobalOptions) {
  if (options.debug) {
    setupLogger("DEBUG");
  }
}
