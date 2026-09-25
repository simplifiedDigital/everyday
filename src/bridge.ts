import { invoke, isTauri, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import type { LocalFile, Result, JobEvent } from "./catalog";
declare const __DEV_TOKEN__: string;
export const desktop = isTauri();
export class TaskError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
const headers = () => ({
  "Content-Type": "application/json",
  "X-Everyday-Token": __DEV_TOKEN__,
});
export async function chooseFiles(
  extensions: string[],
  multiple: boolean,
): Promise<LocalFile[]> {
  const paths = await open({
    multiple,
    filters: extensions.length ? [{ name: "Files", extensions }] : undefined,
  });
  return (paths ? (Array.isArray(paths) ? paths : [paths]) : []).map(
    (path) => ({ path, name: path.split(/[\\/]/).pop()! }),
  );
}
export async function uploadFiles(files: File[]): Promise<LocalFile[]> {
  return Promise.all(
    files.map(async (file) => {
      const res = await fetch(
        `/__local/upload?name=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers: { "X-Everyday-Token": __DEV_TOKEN__ },
          body: file,
        },
      );
      if (!res.ok)
        throw new Error("This file could not be added. Try a smaller file.");
      return await res.json();
    }),
  );
}
export async function runTask(
  tool: string,
  files: LocalFile[],
  options: Record<string, unknown>,
  onProgress: (e: JobEvent) => void,
  jobId: string,
): Promise<Result> {
  const request = { tool, files: files.map((f) => f.path), options };
  if (desktop) {
    const unlisten = await listen<JobEvent>("job-progress", ({ payload }) => {
      if (payload.jobId === jobId) onProgress(payload);
    });
    try {
      const value = await invoke<JobEvent>("run_job", { request, jobId });
      if (value.event === "error")
        throw new TaskError(
          value.message || "Something went wrong.",
          value.code,
        );
      return value;
    } finally {
      unlisten();
    }
  }
  const response = await fetch("/__local/run", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ request, jobId }),
  });
  if (!response.ok)
    throw new Error("The local tools are not ready. Please restart the app.");
  let after = 0;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const res = await fetch(`/__local/job?id=${jobId}&after=${after}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error("The task was interrupted. Please try again.");
    const events = (await res.json()) as JobEvent[];
    after += events.length;
    for (const event of events) {
      if (event.event === "result") return event;
      if (event.event === "error")
        throw new TaskError(
          event.message || "Something went wrong.",
          event.code,
        );
      onProgress(event);
    }
  }
}
export async function cancelTask(jobId: string) {
  if (desktop) await invoke("cancel_job", { jobId });
  else
    await fetch("/__local/cancel", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ jobId }),
    });
}
export async function openOutput(path: string, reveal = false) {
  if (desktop) await invoke("open_output", { path, reveal });
  else {
    const res = await fetch("/__local/output-link", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ path, reveal }),
    });
    const { url } = await res.json();
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.click();
  }
}
export function audioUrl(path: string) {
  return desktop
    ? convertFileSrc(path)
    : `/__local/media?path=${encodeURIComponent(path)}&token=${__DEV_TOKEN__}`;
}
