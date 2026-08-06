# Rystal-Shell

**Rystal-Shell** is a part of the GUI shell for [Ryprland](https://github.com/ry2x/Ryprland-dot/).
This shell is based on [Aylur's GTK Shell](https://github.com/aylur/ags) called AGS.

[https://github.com/user-attachments/assets/5e309397-45a1-4d81-b356-dac4220af26a](https://github.com/user-attachments/assets/8e5a3ac4-4107-4b52-b694-a8c6a0ac113e)

> [!NOTE]
> [WHY AGS? AND ABOUT MEMORY CONSUMPTION](#why-ags-was-chosen-and-its-memory-consumption)

## Requirements

When you install Ryprland, this repository is cloned as a submodule and included in the Ryprland configuration.
So, you don't need to install it separately.

If you want to use this shell in your own configuration, you can clone this repository and use it as a part of your configuration.

- [aylurs-gtk-shell-git](https://aur.archlinux.org/packages/aylurs-gtk-shell-git)
- [libastal-meta](https://aur.archlinux.org/packages/libastal-meta)
- pnpm (for development only)

```sh
# for Arch Linux
paru -S aylurs-gtk-shell-git libastal-meta
```

### How to Start

These are pre-configured in Ryprland's configuration, so normally you don't need to start it manually.

Make sure you have created a `~/.config/ags` directory and copied the contents of this repository into it.

Run the following command to start the shell:

```sh
cd ~/.config/ags
./launch.sh
```

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
  "notifications": {
    "maxCount": "<Maximum number of persistent notifications; positive integer.>"
  },
  "worldClocks": [
    { "label": "<Your preferred location>", "tz": "<Timezone of that location>" },
    ...
  ],
  "recorder": {
    "savePath": "<Directory to save recorded videos>",
    "filenameFormat": "<Filename format for the recorded videos>",
    "recordAudio": "<Boolean(true/false) value indicating whether to record audio or not>",
    "audioSource": "<Audio source for recording audio; 'system' or 'mic'>"
  },
  "profile": {
    "avatarPath": "<Profile picture; 512x512 .png format is recommended>"
  },
  "brightness": {
    "backend": "<Backend for brightness control; 'auto', 'brightnessctl', 'ddcutil'.>"
  }
}
```

## Development Note

Running `pnpm run tsc` will throw errors in the following 2 files:

> `../../../usr/share/ags/js/lib/gtk4/app.ts:288`
> `../../../usr/share/ags/js/node_modules/gnim/dist/jsx/state.ts:715`

You can safely ignore these errors.

## Why AGS was chosen and its memory consumption

Maybe some people are wondering, "Why AGS? Why not QuickShell?"

Recently, QuickShell has become increasingly popular in the Hyprland community. Its memory efficiency and beautiful animations are definitely compelling reasons to choose it.

However, I'm still a beginner with both GTK and Qt. One of the main reasons I chose AGS was that I wanted to learn GObject, one of GTK's core strengths. Since I already had experience with React, I was also interested in understanding how GTK development differs from web development.

I've been reading the GJS and Gnim documentation and doing my best to avoid memory leaks wherever possible.

For those interested, here are the memory usage numbers I've observed, including the worst-case scenario:

- **Usually case:**
  - `around 270 ~ 350 MB` (usually around 300 MB)

- **Worst case:**
  - `around 350 ~ 450 MB` (I have never seen it exceed around 450 MB with `maxCount = 30`)
