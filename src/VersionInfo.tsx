import { useEffect, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowUpRight, LoaderCircle, RefreshCw, X } from "lucide-react";
import { desktop } from "./bridge";
import { compareVersions, latestRelease, type Release } from "./releases";

declare const __APP_VERSION__: string;
type Status = "idle" | "checking" | "checked" | "error";

export default function VersionInfo() {
  const [installed, setInstalled] = useState(__APP_VERSION__);
  const [status, setStatus] = useState<Status>("idle");
  const [release, setRelease] = useState<Release | null>(null);
  const [linkError, setLinkError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (desktop)
      getVersion()
        .then((version) => {
          if (alive.current) setInstalled(version);
        })
        .catch(() => {
          /* The build embeds the same validated version as a fallback. */
        });
    return () => {
      alive.current = false;
      request.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const check = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setStatus("checking");
    setRelease(null);
    setLinkError(false);
    timer.current = setTimeout(() => controller.abort(), 10000);
    try {
      const latest = await latestRelease(controller.signal);
      if (alive.current) {
        setRelease(latest);
        setStatus("checked");
      }
    } catch {
      if (alive.current) setStatus("error");
    } finally {
      if (timer.current) clearTimeout(timer.current);
      request.current = null;
    }
  };
  const newer = release && compareVersions(release.version, installed) > 0;
  const ahead = release && compareVersions(installed, release.version) > 0;
  const openRelease = async () => {
    if (!release) return;
    try {
      if (desktop) await openUrl(release.url);
      else window.open(release.url, "_blank", "noopener,noreferrer");
    } catch {
      setLinkError(true);
    }
  };

  return (
    <>
      <button
        className="version-button"
        aria-label={`Everyday v${installed}. Version and updates`}
        onClick={() => {
          dialog.current?.showModal();
          if (status === "idle") void check();
        }}
      >
        Everyday <span>v{installed}</span>
        {newer && <span className="update-badge">Update available</span>}
      </button>
      <dialog
        ref={dialog}
        className="version-dialog"
        aria-labelledby="version-title"
        onClick={(e) => {
          if (e.target === dialog.current) {
            const rect = dialog.current.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX > rect.right ||
              e.clientY < rect.top ||
              e.clientY > rect.bottom
            )
              dialog.current.close();
          }
        }}
      >
        <div className="version-heading">
          <h2 id="version-title">Version & updates</h2>
          <button
            className="version-close"
            aria-label="Close version information"
            onClick={() => dialog.current?.close()}
          >
            <X size={18} />
          </button>
        </div>
        <dl className="version-details">
          <div>
            <dt>Installed</dt>
            <dd>v{installed}</dd>
          </div>
          <div>
            <dt>Latest</dt>
            <dd>
              {status === "checking"
                ? "Checking…"
                : release
                  ? `v${release.version}`
                  : status === "checked"
                    ? "Not published yet"
                    : "Unknown"}
            </dd>
          </div>
        </dl>
        <p className="version-status" role="status">
          {status === "checking"
            ? "Checking GitHub Releases…"
            : status === "error"
              ? "Couldn't check. Try again when you're online."
              : newer
                ? "A new version is available."
                : ahead
                  ? "You're using a newer build."
                  : release
                    ? "You're up to date."
                    : "No releases have been published yet."}
        </p>
        {linkError && (
          <p className="version-status" role="alert">
            Couldn't open your browser. Try again.
          </p>
        )}
        <div className="version-actions">
          <button
            className="version-check"
            disabled={status === "checking"}
            onClick={() => void check()}
          >
            {status === "checking" ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <RefreshCw size={15} />
            )}{" "}
            Check again
          </button>
          {newer && (
            <button
              className="version-download"
              onClick={() => void openRelease()}
            >
              Get update <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
