import { spawnSync } from "node:child_process";
import path from "node:path";
const python =
  process.env.EVERYDAY_PYTHON ||
  path.resolve(
    process.platform === "win32"
      ? ".venv/Scripts/python.exe"
      : ".venv/bin/python",
  );
process.exit(
  spawnSync(
    python,
    ["-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py", "-v"],
    { stdio: "inherit" },
  ).status || 0,
);
