export const RELEASES_URL =
  "https://github.com/simplifiedDigital/everyday/releases";
export const RELEASE_API =
  "https://api.github.com/repos/simplifiedDigital/everyday/releases/latest";

export type Release = { version: string; url: string };

export function compareVersions(left: string, right: string): number {
  const parts = (value: string) => {
    if (!/^\d{1,8}\.\d{1,8}\.\d{1,8}$/.test(value))
      throw new Error("Invalid version");
    return value.split(".").map(Number);
  };
  const a = parts(left),
    b = parts(right);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}

export async function latestRelease(
  signal: AbortSignal,
): Promise<Release | null> {
  const response = await fetch(RELEASE_API, {
    signal,
    credentials: "omit",
    cache: "no-store",
    headers: { Accept: "application/vnd.github+json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not check releases");
  const release = await response.json();
  if (
    typeof release.tag_name !== "string" ||
    release.draft ||
    release.prerelease
  )
    throw new Error("Invalid release");
  const version = release.tag_name.replace(/^v/, "");
  compareVersions(version, version);
  // Construct a link to our own repository, rather than opening a server-supplied URL.
  return {
    version,
    url: `${RELEASES_URL}/tag/${encodeURIComponent(release.tag_name)}`,
  };
}
