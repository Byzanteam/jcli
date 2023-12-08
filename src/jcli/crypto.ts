import { base16 } from "@scure/base";

const DIGEST_ALGORITHMS = "SHA-256";

export async function digest(
  data: Uint8Array,
  digestAlgorithms = DIGEST_ALGORITHMS,
): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest(digestAlgorithms, data),
  );

  return base16.encode(hash).toLowerCase();
}
