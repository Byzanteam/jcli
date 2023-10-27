import { ConfigSerializer } from "@/jcli/config/config.ts";

export function makeJSONSerializer<T>(): ConfigSerializer<T> {
  return {
    serialize(config: T): Promise<string> {
      return Promise.resolve(JSON.stringify(config, null, 2));
    },

    deserialize(data: string): Promise<T> {
      return new Promise((resolve) => {
        resolve(JSON.parse(data));
      });
    },
  };
}
