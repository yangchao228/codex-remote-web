import fs from "node:fs/promises";
import path from "node:path";

function isInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function resolveAllowedWorkspace(
  requestedWorkspace: string | undefined,
  allowlist: string[],
): Promise<string> {
  const target = path.resolve(requestedWorkspace ?? allowlist[0] ?? process.cwd());
  const realTarget = await fs.realpath(target);

  for (const item of allowlist) {
    const realAllowed = await fs.realpath(item);
    if (isInside(realAllowed, realTarget)) {
      return realTarget;
    }
  }

  throw new Error("Workspace is outside the configured allowlist");
}
