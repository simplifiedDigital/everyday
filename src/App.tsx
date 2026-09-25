import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FolderOpen,
  Grid2X2,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
  RefreshCw,
  SlidersHorizontal,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import VersionInfo from "./VersionInfo";
import {
  categories,
  tools,
  type Tool,
  type LocalFile,
  type Result,
  type JobEvent,
} from "./catalog";
import {
  desktop,
  chooseFiles,
  uploadFiles,
  runTask,
  cancelTask,
  openOutput,
  audioUrl,
  TaskError,
} from "./bridge";

type Box = { page: number; x: number; y: number; w: number; h: number };
const defaults = {
  pages: "",
  page: 1,
  angle: 90,
  password: "",
  newPassword: "",
  width: 1200,
  format: "jpg",
  columns: 2,
  size: 100,
  kind: "memorable",
  words: 6,
  length: 20,
  symbols: true,
  text: "",
};
const nameOf = (path: string) => path.split(/[\\/]/).pop() || path;

export default function App() {
  const [category, setCategory] = useState("all");
  const [tool, setTool] = useState<Tool | null>(null);
  const [search, setSearch] = useState("");
  const [locked, setLocked] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const navigate = (id: string) => {
    if (locked) return;
    setSearch("");
    setCategory(id);
    setTool(id === "password" ? tools.find((t) => t.id === "password")! : null);
  };
  const activeCategory = categories.find(
    (c) => c.id === (tool?.category || category),
  );
  const matches = tools.filter((t) =>
    search
      ? `${t.name} ${t.description}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : t.category === category,
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("all")}
          disabled={locked}
          aria-label="Everyday home"
        >
          <span className="brand-mark">
            <Grid2X2 size={19} />
          </span>
          everyday<span className="brand-period">.</span>
        </button>
        <nav aria-label="Tool categories">
          <button
            className={`nav-item ${category === "all" && !tool ? "active" : ""}`}
            onClick={() => navigate("all")}
            disabled={locked}
          >
            <Grid2X2 size={18} />
            All tools
          </button>
          <span className="nav-label">YOUR TOOLBOX</span>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`nav-item ${(tool?.category || category) === c.id ? "active" : ""}`}
              onClick={() => navigate(c.id)}
              disabled={locked}
            >
              <c.icon size={18} />
              {c.name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="local-dot" />
          Made for your everyday.
          <div className="version">Free. Private. Yours.</div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Your toolbox
            {activeCategory && (
              <>
                <ChevronRight size={13} />
                <span>{activeCategory.name}</span>
              </>
            )}
          </div>
          <label className="search">
            <Search size={16} />
            <input
              ref={searchRef}
              value={search}
              disabled={locked}
              placeholder="Find a tool"
              onChange={(e) => {
                setSearch(e.target.value);
                setTool(null);
              }}
              aria-label="Find a tool"
            />
            <kbd>{navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} K</kbd>
          </label>
        </header>
        <main>
          {tool && !search ? (
            <Task
              key={tool.id}
              tool={tool}
              back={() => {
                setTool(null);
                setLocked(false);
              }}
              onBusy={setLocked}
            />
          ) : (
            <>
              <div className="page-heading">
                <div className="eyebrow">
                  {search
                    ? "FIND YOUR TOOL"
                    : category === "all"
                      ? "A LITTLE LESS EFFORT"
                      : "YOUR EVERYDAY ESSENTIALS"}
                </div>
                <h1>
                  {search ? (
                    "What are you looking for?"
                  ) : category === "all" ? (
                    <>
                      Little tasks, <span>done.</span>
                    </>
                  ) : (
                    activeCategory?.name
                  )}
                </h1>
                <p>
                  {search
                    ? `${matches.length} ${matches.length === 1 ? "tool" : "tools"} found`
                    : category === "all"
                      ? "Simple tools for the things you need to get done."
                      : activeCategory?.subtitle}
                </p>
              </div>
              {category === "all" && !search ? (
                <div className="category-grid">
                  {categories.map((c) => (
                    <button
                      className="category-card"
                      key={c.id}
                      onClick={() => navigate(c.id)}
                    >
                      <span className={`category-icon ${c.color}`}>
                        <c.icon size={27} strokeWidth={1.65} />
                      </span>
                      <span className="card-arrow">
                        <ArrowUp size={18} />
                      </span>
                      <h2>{c.name}</h2>
                      <p>{c.short}</p>
                      <span className="tool-count">
                        {tools.filter((t) => t.category === c.id).length}{" "}
                        {c.id === "password" ? "tool" : "tools"}
                        <ArrowRight size={13} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="tools-grid">
                  {matches.map((t) => (
                    <button
                      className="tool-card"
                      key={t.id}
                      onClick={() => {
                        setTool(t);
                        setCategory(t.category);
                        setSearch("");
                      }}
                    >
                      <span
                        className={`small-icon ${categories.find((c) => c.id === t.category)?.color}`}
                      >
                        <t.icon size={21} strokeWidth={1.7} />
                      </span>
                      <span>
                        <strong>{t.name}</strong>
                        <small>{t.description}</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                  {!matches.length && (
                    <div className="empty-search">
                      No tools found. Try “PDF”, “photo”, or “audio”.
                    </div>
                  )}
                </div>
              )}
              <div className="privacy-note">
                <ShieldCheck size={16} />
                <span>Your files stay on your computer.</span>
                <span className="separator">·</span>
                <span>No sign-up. No fuss.</span>
              </div>
            </>
          )}
        </main>
        <footer>
          <span>A small toolbox for a simpler day.</span>
          <VersionInfo />
        </footer>
      </div>
    </div>
  );
}

function Task({
  tool,
  back,
  onBusy,
}: {
  tool: Tool;
  back: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [options, setOptions] = useState(defaults);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [event, setEvent] = useState<JobEvent | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [preview, setPreview] = useState<Result | null>(null);
  const [previewPage, setPreviewPage] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [draft, setDraft] = useState<Box | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const job = useRef("");
  const previewRequest = useRef(0);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const busyRef = useRef(false);
  const multiple = "multiple" in tool && !!tool.multiple;
  const color = categories.find((c) => c.id === tool.category)!.color;
  const set = (key: keyof typeof defaults, value: unknown) =>
    setOptions((o) => ({ ...o, [key]: value }));
  const add = (next: LocalFile[]) => {
    const accepted = next.filter(
      (f) =>
        !tool.accept.length ||
        tool.accept.includes(f.name.split(".").pop()!.toLowerCase()),
    );
    if (accepted.length !== next.length)
      setError(
        `Choose ${tool.accept.join(", ").toUpperCase()} files for this task.`,
      );
    else setError("");
    if (!accepted.length) return;
    setFiles((prev) =>
      multiple
        ? [
            ...prev,
            ...accepted.filter((f) => !prev.some((p) => p.path === f.path)),
          ]
        : accepted.slice(0, 1),
    );
    setResult(null);
    setBoxes([]);
    setPreviewPage(0);
    setPreview(null);
  };
  const addRef = useRef(add);
  addRef.current = add;
  useEffect(() => {
    if (!desktop) return;
    let disposed = false;
    let off: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((e) => {
        if (busyRef.current) return;
        setDragging(e.payload.type === "over");
        if (e.payload.type === "drop")
          addRef.current(
            e.payload.paths.map((path) => ({ path, name: nameOf(path) })),
          );
      })
      .then((fn) => {
        if (disposed) fn();
        else off = fn;
      });
    return () => {
      disposed = true;
      off?.();
    };
  }, []);
  useEffect(() => {
    busyRef.current = busy;
    onBusy(busy);
  }, [busy, onBusy]);
  useEffect(() => {
    const id = ++previewRequest.current;
    if (!files.length || !["pdf", "image"].includes(tool.category)) return;
    setPreviewLoading(true);
    runTask(
      "inspect",
      tool.id === "image-collage" ? files : files.slice(0, 1),
      {
        password: options.password,
        page: previewPage,
        collage: tool.id === "image-collage",
        columns: options.columns,
      },
      () => {},
      crypto.randomUUID(),
    )
      .then((info) => {
        if (id === previewRequest.current) {
          setPreview(info);
          setNeedsPassword(false);
        }
      })
      .catch((e) => {
        if (
          id === previewRequest.current &&
          e instanceof TaskError &&
          e.code === "password"
        )
          setNeedsPassword(true);
      })
      .finally(() => {
        if (id === previewRequest.current) setPreviewLoading(false);
      });
    return () => {
      ++previewRequest.current;
    };
  }, [
    files,
    previewPage,
    options.password,
    options.columns,
    tool.category,
    tool.id,
  ]);
  const pick = async () => {
    try {
      if (desktop) add(await chooseFiles(tool.accept, multiple));
      else fileInput.current?.click();
    } catch {
      setError("The file picker could not open. Please try again.");
    }
  };
  const browserFiles = async (list: FileList | null) => {
    if (!list) return;
    setAdding(true);
    try {
      add(await uploadFiles(Array.from(list)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };
  const run = async () => {
    setBusy(true);
    setResult(null);
    setError("");
    setCopied(false);
    setEvent({ event: "progress", message: "Getting things ready…" });
    job.current = crypto.randomUUID();
    try {
      const value = await runTask(
        tool.id,
        files,
        { ...options, boxes },
        setEvent,
        job.current,
      );
      setResult(value);
    } catch (e) {
      if (e instanceof TaskError && e.code === "password")
        setNeedsPassword(true);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Select the text and copy it with your keyboard.");
    }
  };
  const openResult = async (path: string, reveal = false) => {
    try {
      await openOutput(path, reveal);
    } catch {
      setError("The file is saved, but could not be opened automatically.");
    }
  };
  function point(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }
  const isPassword = tool.id === "password";
  const isSpeak = tool.id === "audio-speak";
  const ready =
    isPassword ||
    ((isSpeak ? !!options.text.trim() : files.length > 0) &&
      (!tool.id.endsWith("merge") || files.length > 1) &&
      (tool.id !== "pdf-redact" || boxes.length > 0));
  const reorder = (i: number, delta: number) =>
    setFiles((prev) => {
      const next = [...prev];
      [next[i], next[i + delta]] = [next[i + delta], next[i]];
      return next;
    });
  return (
    <div className="task-page">
      <button className="back-button" onClick={back} disabled={busy}>
        <ArrowLeft size={15} />
        All {categories
          .find((c) => c.id === tool.category)!
          .name.toLowerCase()}{" "}
        tools
      </button>
      <div className="task-heading">
        <span className={`category-icon ${color}`}>
          <tool.icon size={27} strokeWidth={1.7} />
        </span>
        <div>
          <h1>{tool.name}</h1>
          <p>{tool.description}.</p>
        </div>
      </div>
      <input
        ref={fileInput}
        type="file"
        hidden
        multiple={multiple}
        accept={tool.accept.map((e) => `.${e}`).join(",")}
        onChange={(e) => {
          browserFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {!result && !busy && (
        <>
          {!isPassword && !isSpeak && (
            <>
              {!files.length ? (
                <div
                  className={`dropzone ${dragging ? "dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    if (!desktop) browserFiles(e.dataTransfer.files);
                  }}
                >
                  <span className="upload-icon">
                    <Upload size={25} strokeWidth={1.5} />
                  </span>
                  <h2>
                    {adding
                      ? "Adding your files…"
                      : `Drop ${multiple ? "your files" : "a file"} here`}
                  </h2>
                  <span className="drop-or">
                    or pick {multiple ? "them" : "one"} from your computer
                  </span>
                  <button
                    className="button primary"
                    onClick={pick}
                    disabled={adding}
                  >
                    <Plus size={16} />
                    Choose {multiple ? "files" : "file"}
                  </button>
                  <small>
                    {tool.accept.length
                      ? tool.accept.slice(0, 6).join(", ").toUpperCase()
                      : "Any file type"}
                  </small>
                </div>
              ) : (
                <div className="files-list">
                  {files.map((file, i) => (
                    <div className="file-row" key={file.path}>
                      <tool.icon size={20} />
                      <span title={file.name}>{file.name}</span>
                      {multiple && files.length > 1 && (
                        <>
                          <button
                            className="icon-button"
                            aria-label={`Move ${file.name} up`}
                            disabled={i === 0}
                            onClick={() => reorder(i, -1)}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Move ${file.name} down`}
                            disabled={i === files.length - 1}
                            onClick={() => reorder(i, 1)}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </>
                      )}
                      <button
                        className="icon-button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => {
                          setFiles((fs) =>
                            fs.filter((f) => f.path !== file.path),
                          );
                          setBoxes([]);
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {multiple && (
                    <button className="add-files" onClick={pick}>
                      <Plus size={15} />
                      Add more files
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          {isSpeak && (
            <label className="speech-input">
              <textarea
                aria-label="Text to read aloud"
                placeholder="Type or paste your text here…"
                value={options.text}
                maxLength={50000}
                onChange={(e) => set("text", e.target.value)}
              />
              <span>{options.text.length.toLocaleString()} / 50,000</span>
            </label>
          )}
          {(files.length > 0 || isPassword) && (
            <div className="options-panel">
              {isPassword && (
                <>
                  <div className="segmented" aria-label="Password type">
                    {[
                      ["memorable", "Memorable"],
                      ["random", "Random"],
                      ["pin", "PIN"],
                    ].map(([id, text]) => (
                      <button
                        key={id}
                        className={options.kind === id ? "selected" : ""}
                        onClick={() => {
                          set("kind", id);
                          set("length", id === "pin" ? 6 : 20);
                          setResult(null);
                        }}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                  <Field
                    label={
                      options.kind === "memorable"
                        ? "Number of words"
                        : "Length"
                    }
                  >
                    <input
                      type="number"
                      min={
                        options.kind === "memorable"
                          ? 4
                          : options.kind === "pin"
                            ? 6
                            : 8
                      }
                      max={options.kind === "memorable" ? 10 : 128}
                      value={
                        options.kind === "memorable"
                          ? options.words
                          : options.length
                      }
                      onChange={(e) =>
                        set(
                          options.kind === "memorable" ? "words" : "length",
                          Number(e.target.value),
                        )
                      }
                    />
                  </Field>
                </>
              )}
              {["pdf-split", "pdf-rotate"].includes(tool.id) && (
                <Field label="Pages" hint="Leave blank for all pages">
                  <input
                    value={options.pages}
                    placeholder="All pages, or 1-3, 5"
                    onChange={(e) => set("pages", e.target.value)}
                  />
                </Field>
              )}
              {tool.id === "pdf-extract" && (
                <Field label="Page to save">
                  <input
                    type="number"
                    min="1"
                    max={preview?.pages}
                    value={options.page}
                    onChange={(e) => {
                      set("page", Number(e.target.value));
                      setPreviewPage(Math.max(0, Number(e.target.value) - 1));
                    }}
                  />
                </Field>
              )}
              {tool.id === "pdf-rotate" && (
                <Field label="Rotate">
                  <select
                    value={options.angle}
                    onChange={(e) => set("angle", Number(e.target.value))}
                  >
                    <option value="90">90° clockwise</option>
                    <option value="180">180° upside down</option>
                    <option value="270">90° counterclockwise</option>
                  </select>
                </Field>
              )}
              {(needsPassword || tool.id === "pdf-unlock") && (
                <Field label="Current PDF password">
                  <input
                    type="password"
                    autoComplete="off"
                    value={options.password}
                    onChange={(e) => set("password", e.target.value)}
                  />
                </Field>
              )}
              {tool.id === "pdf-protect" && (
                <Field label="New password">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={options.newPassword}
                    onChange={(e) => set("newPassword", e.target.value)}
                  />
                </Field>
              )}
              {tool.id === "image-resize" && (
                <Field label="Width" hint="Height adjusts automatically">
                  <div className="unit-input">
                    <input
                      type="number"
                      min="1"
                      max="16000"
                      value={options.width}
                      onChange={(e) => set("width", Number(e.target.value))}
                    />
                    <span>px</span>
                  </div>
                </Field>
              )}
              {["image-resize", "image-convert"].includes(tool.id) && (
                <Field label="Save as">
                  <select
                    value={options.format}
                    onChange={(e) => set("format", e.target.value)}
                  >
                    <option value="jpg">JPG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                  </select>
                </Field>
              )}
              {tool.id === "image-collage" && (
                <Field label="Photos per row">
                  <select
                    value={options.columns}
                    onChange={(e) => set("columns", Number(e.target.value))}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </Field>
              )}
              {tool.id === "file-split" && (
                <Field label="Size of each part">
                  <select
                    value={options.size}
                    onChange={(e) => set("size", Number(e.target.value))}
                  >
                    <option value="10">10 MB</option>
                    <option value="25">25 MB</option>
                    <option value="100">100 MB</option>
                    <option value="500">500 MB</option>
                  </select>
                </Field>
              )}
            </div>
          )}
          {files.length > 0 &&
            [
              "sheet-merge",
              "sheet-excel",
              "pdf-markdown",
              "file-join",
            ].includes(tool.id) && (
              <p className="task-hint">
                {tool.id === "sheet-merge"
                  ? "Keeps saved values and basic formatting. Charts and formulas are not copied."
                  : tool.id === "sheet-excel"
                    ? "Adds a styled header, filters, and tidy columns. Values stay exactly as written."
                    : tool.id === "pdf-markdown"
                      ? "Includes an images folder. Scanned pages are kept as images."
                      : "Choose the .parts.json file. Keep all the numbered parts in the same folder."}
              </p>
            )}
          {previewLoading && (
            <div className="preview-loading">
              <LoaderCircle size={16} className="spin" />
              Loading preview…
            </div>
          )}
          {!previewLoading && preview?.preview && files.length > 0 && (
            <div className="preview-panel">
              <div className="preview-toolbar">
                <span>
                  {tool.id === "pdf-redact"
                    ? "Draw over details to remove"
                    : "Preview"}
                </span>
                {preview.pages && (
                  <div className="page-control">
                    <button
                      className="icon-button"
                      aria-label="Previous page"
                      disabled={previewPage === 0}
                      onClick={() => setPreviewPage((p) => p - 1)}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <span>
                      {previewPage + 1} / {preview.pages}
                    </span>
                    <button
                      className="icon-button"
                      aria-label="Next page"
                      disabled={previewPage + 1 >= preview.pages}
                      onClick={() => setPreviewPage((p) => p + 1)}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                )}
                {tool.id === "pdf-redact" && (
                  <button
                    className="text-button"
                    onClick={() => setBoxes((b) => b.slice(0, -1))}
                    disabled={!boxes.length}
                  >
                    Undo
                  </button>
                )}
              </div>
              <div className="preview-surface">
                <div
                  className={`document-preview ${tool.id === "pdf-redact" ? "redact-canvas" : ""}`}
                  onPointerDown={(e) => {
                    if (tool.id !== "pdf-redact") return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    startPoint.current = point(e);
                    setDraft({
                      page: previewPage,
                      ...startPoint.current,
                      w: 0,
                      h: 0,
                    });
                  }}
                  onPointerMove={(e) => {
                    if (!startPoint.current) return;
                    const p = point(e);
                    const a = startPoint.current;
                    setDraft({
                      page: previewPage,
                      x: Math.min(a.x, p.x),
                      y: Math.min(a.y, p.y),
                      w: Math.abs(p.x - a.x),
                      h: Math.abs(p.y - a.y),
                    });
                  }}
                  onPointerUp={() => {
                    if (draft && draft.w > 0.003 && draft.h > 0.003)
                      setBoxes((b) => [...b, draft]);
                    setDraft(null);
                    startPoint.current = null;
                  }}
                >
                  <img
                    src={preview.preview}
                    draggable={false}
                    alt={
                      tool.category === "pdf"
                        ? `PDF page ${previewPage + 1}`
                        : "Your photo"
                    }
                  />
                  {[...boxes, ...(draft ? [draft] : [])]
                    .filter((b) => b.page === previewPage)
                    .map((b, i) => (
                      <span
                        className="redact-box"
                        key={i}
                        style={{
                          left: `${b.x * 100}%`,
                          top: `${b.y * 100}%`,
                          width: `${b.w * 100}%`,
                          height: `${b.h * 100}%`,
                        }}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {busy && (
        <div className="working-state" role="status">
          <div className="working-icon">
            <LoaderCircle size={27} className="spin" />
          </div>
          <h2>{event?.message || "Working on it…"}</h2>
          <div
            className={`progress-track ${event?.percent == null ? "indeterminate" : ""}`}
          >
            <div style={{ width: `${event?.percent ?? 35}%` }} />
          </div>
          {event?.percent != null && (
            <span className="progress-percent">
              {Math.round(event.percent)}%
            </span>
          )}
          <button
            className="button secondary"
            onClick={() => {
              cancelTask(job.current);
              setEvent({ event: "progress", message: "Cancelling…" });
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {result && (
        <div className={`result-panel ${isPassword ? "password-result" : ""}`}>
          <span className="success-icon">
            <Check size={25} />
          </span>
          <h2>
            {isPassword ? "A fresh password, just for you." : "All done."}
          </h2>
          {result.password ? (
            <>
              <div className="generated-password">{result.password}</div>
              <button
                className="button primary"
                onClick={() => copy(result.password!)}
              >
                {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy password"}
              </button>
            </>
          ) : (
            <>
              <p>
                {result.files?.length === 1
                  ? "Your file is ready."
                  : `${result.files?.length} files are ready.`}
              </p>
              {result.text && (
                <textarea
                  className="result-text"
                  readOnly
                  value={result.text}
                  aria-label="Converted text"
                />
              )}
              {tool.id === "audio-speak" && result.files?.[0] && (
                <audio controls autoPlay src={audioUrl(result.files[0])} />
              )}
              {result.warning && (
                <p className="result-warning">{result.warning}</p>
              )}
              <div className="result-actions">
                <button
                  className="button primary"
                  onClick={() => openResult(result.files![0])}
                >
                  {desktop ? <FolderOpen size={16} /> : <Download size={16} />}
                  {desktop ? "Open file" : "Save file"}
                </button>
                <button
                  className="button secondary"
                  onClick={() => openResult(result.folder!, true)}
                >
                  <FolderOpen size={16} />
                  {desktop ? "Show in folder" : "Save all as ZIP"}
                </button>
                {result.text && (
                  <button
                    className="icon-button"
                    aria-label="Copy text"
                    onClick={() => copy(result.text!)}
                  >
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                  </button>
                )}
              </div>
              <span className="saved-location">
                Saved to{" "}
                {desktop ? "Downloads / Everyday" : "your local preview folder"}
              </span>
            </>
          )}
        </div>
      )}
      {error && (
        <div className="error-message" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {!busy && (
        <div className="task-bottom">
          {result && isPassword && (
            <button className="text-button" onClick={() => setResult(null)}>
              Change options
            </button>
          )}
          {result ? (
            <button
              className="button secondary"
              onClick={() => {
                setResult(null);
                if (isPassword) run();
              }}
            >
              <RefreshCw size={15} />
              {isPassword ? "Generate another" : "Start again"}
            </button>
          ) : (
            <>
              <span className="originals-note">
                <ShieldCheck size={15} />
                {isPassword
                  ? "Generated on your device"
                  : isSpeak
                    ? "Created on your computer"
                    : "Your originals stay untouched"}
              </span>
              <button
                className="button primary"
                disabled={!ready || adding}
                onClick={run}
              >
                {tool.action}
                <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
