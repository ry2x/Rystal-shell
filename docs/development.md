# Development

Install the [build requirements](installation.md#requirements) and `direnv`, then run these commands
from the repository root:

```sh
pnpm install
direnv allow
pnpm dev
```

The `.envrc` file sets the instance name to `rystal-shell-dev` and isolates config, cache, state,
and runtime data below `.dev/`. Assets are loaded from the source checkout. On first launch,
`scripts/dev.sh` copies the configuration template to `.dev/config/config.json`.

The development environment adds the bundled theme switcher to `PATH`. Directory isolation does
not isolate desktop effects: changing a wallpaper or using power and device controls still affects
the active session.

## Checks and build

```sh
pnpm check
pnpm build
git diff --check
```

`pnpm check` runs formatting checks, ESLint, Knip, the project type check, and the Node tests currently
listed in `package.json`. `pnpm build` bundles `src/app.tsx` and compiles styles into `dist/`.
Use `pnpm format` to apply formatting.

`scripts/typecheck.sh` filters TypeScript diagnostics from system sources under `/usr/share/ags/js/`.
It is not limited to two specific errors. Use `pnpm run tsc` to inspect the unfiltered diagnostics.

For memory or lifecycle changes, the diagnostics in `debug/` include:

```sh
./debug/run-memory-scenarios.sh --scenario all --iterations 10
```

Review the script's options before running it against a live session. Keep generated `.dev/`,
`dist/`, local configuration, and `debug/results/` output out of commits.

[Back to overview](../README.md)
