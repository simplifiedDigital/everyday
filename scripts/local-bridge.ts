// Development-only bridge. Production uses Tauri's local process IPC, with no server.
import type { Plugin } from "vite";
import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir, writeFile, stat, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { createInterface } from "node:readline";
import type { IncomingMessage } from "node:http";

export function localBridge(token: string): Plugin {
  const root = path.resolve(".cache/preview");
  const python =
    process.env.EVERYDAY_PYTHON ||
    path.resolve(
      process.platform === "win32"
        ? ".venv/Scripts/python.exe"
        : ".venv/bin/python",
    );
  const jobs = new Map<string, any[]>();
  const inputs = new Set<string>();
  const outputs = new Set<string>();
  const links = new Map<string, string>();
  async function json(req: IncomingMessage) {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 2_000_000) throw new Error("Request too large");
    }
    return JSON.parse(body || "{}");
  }
  const safeId = (id: unknown): id is string =>
    typeof id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(id);
  return {
    name: "everyday-local-preview",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/__local/")) return next();
        const url = new URL(req.url, "http://127.0.0.1:1420");
        const auth =
          req.headers["x-everyday-token"] || url.searchParams.get("token");
        if (auth !== token) {
          res.statusCode = 403;
          return res.end("Forbidden");
        }
        const send = (value: unknown) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(value));
        };
        try {
          await mkdir(root, { recursive: true });
          if (url.pathname === "/__local/upload" && req.method === "POST") {
            const size = Number(req.headers["content-length"]);
            if (!Number.isFinite(size) || size > 500 * 1024 ** 2) {
              res.statusCode = 413;
              return res.end();
            }
            const name = path
              .basename(url.searchParams.get("name") || "file")
              .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-");
            const dir = path.join(root, "inputs", randomUUID());
            await mkdir(dir, { recursive: true });
            const dest = path.join(dir, name);
            await pipeline(req, createWriteStream(dest));
            inputs.add(dest);
            return send({ name, path: dest, size });
          }
          if (url.pathname === "/__local/run" && req.method === "POST") {
            const { request, jobId } = await json(req);
            if (
              !safeId(jobId) ||
              jobs.has(jobId) ||
              !Array.isArray(request.files) ||
              request.files.some((p: string) => !inputs.has(p))
            )
              throw new Error("Invalid request");
            const events: any[] = [];
            jobs.set(jobId, events);
            const cancel = path.join(root, `${jobId}.cancel`);
            const proc = spawn(python, [path.resolve("engine/worker.py")], {
              windowsHide: true,
              env: { ...process.env, PYTHONIOENCODING: "utf-8" },
            });
            createInterface({ input: proc.stdout }).on("line", (line) => {
              try {
                const e = JSON.parse(line);
                events.push(e);
                if (e.event === "result") {
                  for (const f of e.files || []) outputs.add(f);
                  if (e.folder) outputs.add(e.folder);
                }
              } catch {
                /* third-party log line */
              }
            });
            let detail = "";
            proc.stderr.on("data", (b) => {
              detail = (detail + b.toString()).slice(-4000);
            });
            proc.on("error", () =>
              events.push({
                event: "error",
                message: "The local processing tools are not installed.",
                code: "engine",
              }),
            );
            proc.on("close", () => {
              if (
                !events.some((e) => e.event === "result" || e.event === "error")
              ) {
                events.push({
                  event: "error",
                  message: "The task stopped unexpectedly. Please try again.",
                });
                server.config.logger.error(detail);
              }
              rm(cancel, { force: true });
            });
            proc.stdin.end(
              JSON.stringify({
                ...request,
                cancel_file: cancel,
                output_dir: path.join(root, "outputs"),
                model_dir: path.resolve(".cache/models"),
              }) + "\n",
            );
            return send({ jobId });
          }
          if (url.pathname === "/__local/job") {
            const id = url.searchParams.get("id") || "";
            if (!jobs.has(id)) {
              res.statusCode = 404;
              return res.end();
            }
            return send(
              jobs.get(id)!.slice(Number(url.searchParams.get("after") || 0)),
            );
          }
          if (url.pathname === "/__local/cancel" && req.method === "POST") {
            const { jobId } = await json(req);
            if (!safeId(jobId) || !jobs.has(jobId))
              throw new Error("Invalid job");
            await writeFile(path.join(root, `${jobId}.cancel`), "cancel");
            return send({ ok: true });
          }
          if (
            url.pathname === "/__local/output-link" &&
            req.method === "POST"
          ) {
            const { path: file } = await json(req);
            if (!outputs.has(file)) throw new Error("Unknown output");
            let output = file;
            if ((await stat(file)).isDirectory()) {
              output = path.join(root, `${randomUUID()}.zip`);
              await new Promise<void>((resolve, reject) => {
                const p = spawn(
                  python,
                  [
                    "-c",
                    'import shutil,sys; shutil.make_archive(sys.argv[1],"zip",sys.argv[2])',
                    output.slice(0, -4),
                    file,
                  ],
                  { windowsHide: true },
                );
                p.on("close", (n) =>
                  n === 0
                    ? resolve()
                    : reject(new Error("Could not zip output")),
                );
                p.on("error", reject);
              });
            }
            const id = randomUUID();
            links.set(id, output);
            return send({ url: `/__local/download?id=${id}&token=${token}` });
          }
          if (
            url.pathname === "/__local/download" ||
            url.pathname === "/__local/media"
          ) {
            const file = url.pathname.endsWith("download")
              ? links.get(url.searchParams.get("id") || "")
              : url.searchParams.get("path");
            if (!file || (url.pathname.endsWith("media") && !outputs.has(file)))
              throw new Error("Unknown output");
            res.setHeader(
              "Content-Type",
              file.endsWith(".wav") ? "audio/wav" : "application/octet-stream",
            );
            if (url.pathname.endsWith("download"))
              res.setHeader(
                "Content-Disposition",
                `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(file))}`,
              );
            return await pipeline(createReadStream(file), res);
          }
          res.statusCode = 404;
          res.end();
        } catch (e) {
          res.statusCode = 400;
          send({ error: (e as Error).message });
        }
      });
    },
  };
}
