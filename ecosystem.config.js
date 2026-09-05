/**
 * Full stack, all auto-restarting - not just the background workers
 * despite the file/script names ("workers:start" predates this covering
 * the web app too, kept for backward compat rather than renaming).
 *
 * Run with: npm run workers:start
 * Status:   npm run workers:status
 * Logs:     npm run workers:logs
 * Stop:     npm run workers:stop
 *
 * IMPORTANT: run `npm run build` first - the "web" app below runs the
 * production server (`next start`), which needs a build to already exist,
 * unlike `next dev`.
 *
 * To survive a host reboot (not just a crash): after `workers:start`, run
 * `npx pm2 startup` once (it prints a command to copy/paste - follow it,
 * it registers pm2 with your OS's init system), then `npx pm2 save` every
 * time the set of running processes changes. Without this step, pm2 keeps
 * processes alive across crashes but NOT across a full reboot.
 */
module.exports = {
  apps: [
    {
      name: "web",
      script: "node_modules/.bin/next",
      args: "start",
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 20,
      watch: false,
    },
    {
      name: "gc-bot",
      script: "scripts/gc-bot-worker.ts",
      interpreter: "node_modules/.bin/tsx",
      autorestart: true,
      restart_delay: 5000, // Steam logins that fail back-to-back too fast tend to get rate-limited further
      max_restarts: 20,
      watch: false,
    },
    {
      name: "sync-scheduler",
      script: "scripts/sync-scheduler.ts",
      interpreter: "node_modules/.bin/tsx",
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 20,
      watch: false,
    },
  ],
};
