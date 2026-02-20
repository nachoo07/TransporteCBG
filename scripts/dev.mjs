import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

function run(name, cwd, command, args) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) return;
    if (code === 0) return;
    process.exitCode = 1;
  });

  return child;
}

const backendCwd = fileURLToPath(new URL("../backend", import.meta.url));
const frontendCwd = fileURLToPath(new URL("../frontend", import.meta.url));

const backend = run("backend", backendCwd, "npm", [
  "run",
  "dev",
]);
const frontend = run("frontend", frontendCwd, "npm", [
  "run",
  "dev",
]);

function shutdown(signal) {
  backend.kill(signal);
  frontend.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
