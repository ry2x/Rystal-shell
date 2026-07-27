# RyprAGS-Shell

**RyprAGS-Shell** is a part of the GUI shell for [Ryprland](https://github.com/ry2x/Ryprland-dot/).
To use it, you must be using Ryprland.
For installation instructions, please refer to the Ryprland repository.


[https://github.com/user-attachments/assets/5e309397-45a1-4d81-b356-dac4220af26a](https://github.com/user-attachments/assets/8e5a3ac4-4107-4b52-b694-a8c6a0ac113e)

> [!IMPORTANT]
> Ryprland is currently in the process of transitioning to a different GUI shell. Once the migration is complete, this repository will be archived.
> The new shell under development is planned to be a lightweight shell based on [astal](https://aylur.github.io/astal/), which will not use AGS (gJS).

> [!NOTE]
> [WHY AGS?](#why-ags-was-chosen-and-its-memory-consumption)

## Usage

When you install Ryprland, this repository is cloned as a submodule.
It will be extracted to `/base/.config/ags/` and becomes usable by running `stow ./base`.

### How to Start

```sh
./launch.sh
```

This command will automatically start the shell, provided AGS is installed.
In practice, it relies on Hyprland's autostart capabilities.
When doing so, you need to account for the lag associated with loading the modules.
Therefore, you must introduce a startup delay as shown below:

```lua
-- hyprland.lua
hl.on("hyprland.start",
  function()
    hl.exec_cmd("sleep 5; ~/.config/ags/launch.sh")
    hl.exec_cmd("sleep 10; blueman-applet")
  end
)
```

This is pre-configured in Ryprland.

### Configuration

There are several configurable items in this shell.

First, copy the [config template](./config.json.template) using the following command:

```sh
cp ./config.json.template ./config.json
```

By modifying each setting in that file, you can alter the shell's behavior and some of the displayed information.

```json
{
  "weather": {
    "location": "<Your preferred location; if left blank, the location will be determined from your IP address.>"
  },
  "worldClocks": [
    { "label": "<Your preferred location>", "tz": "<Timezone of that location>" },
    ...
  ],
  "recorder": {
    "savePath": "<Directory to save recorded videos>",
    "filenameFormat": "<Filename format for the recorded videos>"
  },
  "profile": {
    "avatarPath": "<Profile picture; 512x512 .png format is recommended>"
  }
}
```

## Development

### Requirement

- pnpm

### Usage

```bash
# init
ags init         # generate the types for GTK4 and AGS
pnpm install     # install devDependencies

pnpm run lint    # Run ESLint
pnpm run tsc     # Run the TypeScript type checker
pnpm run format  # Run Prettier
pnpm run build   # Build the AGS module
pnpm run start   # Start the AGS module
pnpm run dev     # Start the AGS module with new build
```

> [!NOTE]
> Running `pnpm run tsc` will throw errors in the following three files:
> `../../../usr/share/ags/js/lib/gtk4/app.ts:288`
> `../../../usr/share/ags/js/node_modules/gnim/dist/fetch.ts:406`
> `../../../usr/share/ags/js/node_modules/gnim/dist/jsx/state.ts:715`
> You can safely ignore these errors.

## Why AGS was chosen and its memory consumption

Maybe some people are wondering, "Why AGS? Why not QuickShell?"

Recently, QuickShell has become increasingly popular in the Hyprland community. Its memory efficiency and beautiful animations are definitely compelling reasons to choose it.

However, I'm still a beginner with both GTK and Qt. One of the main reasons I chose AGS was that I wanted to learn GObject, one of GTK's core strengths. Since I already had experience with React, I was also interested in understanding how GTK development differs from web development.

I've been reading the GJS and Gnim documentation and doing my best to avoid memory leaks wherever possible.

For those interested, here are the memory usage numbers I've observed, including the worst-case scenario:

- **Usually case:**
  - `around 350~450 MB`
- **Worst case (many notifications containing large images):**
  - Idle: `~540 MB`
  - Peak: Depends on the number of notifications and the size of the attachments.
    > I think it can be scale unlimited. I tested it with 100 notifications which has 2MB Image each, and the memory usage was around 1.7 GB

Memory usage returns to the idle level after those notifications are cleared.
(not immediately, but gjs will gc them)
