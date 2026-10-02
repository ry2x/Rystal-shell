# Development

For checks and UI trials that must not operate the current desktop, start with
[isolated testing](testing.md). `pnpm sandbox:check` runs checks and a build in a disposable copy;
`pnpm sandbox` opens a private desktop in a window.

Install the [build requirements](installation.md#requirements) and `direnv`, then run these commands
from the repository root:

> [!CAUTION]
> Development directories are isolated, but desktop effects are not. Changing wallpapers
> or using power and device controls still affects the active session.

```sh
pnpm install
direnv allow
pnpm dev
```

The `.envrc` file sets the instance name to `rystal-shell-dev` and isolates config, cache, state,
and runtime data below `.dev/`. Assets are loaded from the source checkout. On first launch,
`scripts/dev.sh` copies the configuration template to `.dev/config/config.json`.

The development environment adds the bundled theme switcher to `PATH`.

## Checks and build

```sh
pnpm check
pnpm build
git diff --check
```

`pnpm check` runs formatting checks, ESLint, Knip, the project type check, and the Node tests currently
listed in `package.json`. `pnpm build` bundles `src/app.tsx` and compiles styles into `dist/`.
Use `pnpm format` to apply formatting.

> [!NOTE]
> `scripts/typecheck.sh` filters TypeScript diagnostics from system sources under `/usr/share/ags/js/`.
> It is not limited to two specific errors. Use `pnpm run tsc` to inspect the unfiltered diagnostics.

For memory or lifecycle changes, the diagnostics in `debug/` include:

```sh
./debug/run-memory-scenarios.sh --scenario all --iterations 10 --dry-run
```

The scenario runner refuses live-session operations by default. `--allow-live-session` explicitly
opts into desktop changes; `pnpm sandbox:smoke` is the isolated alternative and records PSS/RSS for
its exact shell PID.

> [!IMPORTANT]
> Keep generated `.dev/`, `dist/`, local configuration, and `debug/results/` output out of commits.

[Back to overview](../README.md)
