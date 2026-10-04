const fs = require("fs");
const path = require("path");

const root = "/var/www/hbpl";
const envPath = path.join(root, ".env");

function loadEnv(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing environment file: ${file}`);
  }

  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .flatMap((line) => {
        const value = line.trim();
        if (!value || value.startsWith("#")) return [];

        const match = value.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) return [];

        let [, key, parsed] = match;
        parsed = parsed.trim();
        if (
          (parsed.startsWith('"') && parsed.endsWith('"')) ||
          (parsed.startsWith("'") && parsed.endsWith("'"))
        ) {
          parsed = parsed.slice(1, -1);
        }

        return [[key, parsed]];
      }),
  );
}

const env = loadEnv(envPath);

module.exports = {
  apps: [
    {
      name: "hbpl-nextjs",
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: `${root}/new-ui/new-hbpl-ui`,
      interpreter: "none",
      env: { ...env, NODE_ENV: "production" },
      autorestart: true,
      restart_delay: 5000,
      watch: false,
      max_memory_restart: "300M",
    },
    {
      name: "hbpl-django",
      script: `${root}/.venv/bin/gunicorn`,
      args: "hbpl_project.asgi:application -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8002 --workers 2 --timeout 120",
      cwd: `${root}/backend`,
      interpreter: "none",
      env,
      autorestart: true,
      restart_delay: 5000,
      watch: false,
    },
    {
      name: "hbpl-celery",
      script: `${root}/.venv/bin/celery`,
      args: "-A hbpl_project worker --loglevel=INFO --concurrency=2",
      cwd: `${root}/backend`,
      interpreter: "none",
      env,
      autorestart: true,
      restart_delay: 5000,
      watch: false,
    },
  ],
};
