# Rystal-shell Configuration

`config.json.template` placed in this directory is a template configuration file for Rystal-shell.
It contains various settings that can be customized to alter the behavior of the shell and some of the displayed information.

Rystal-shell has a default configuration settings, but you can create a custom configuration file by copying the template and modifying it according to your preferences.

> [!NOTE]
> Default configuration settings are coded in
> [`/src/lib/configParser.ts`](/src/lib/configParser.ts).
> If you want to change settings without creating a custom configuration file, you can modify the default settings in that file.

The user configuration may contain only the values that differ from the defaults. Missing object
properties are filled individually from the defaults, while arrays such as `worldClocks` replace the
default array in full. Invalid values fall back to their defaults, and unknown keys produce a warning.

## 1. Placement

The configuration file should be placed in the following directory:

```sh
"${XDG_CONFIG_HOME:-$HOME/.config}/rystal-shell/config.json"
```

run the following command to create the directory and copy the template:

```sh
mkdir -p "${XDG_CONFIG_HOME:-$HOME/.config}/rystal-shell"
cp ./config.json.template \
  "${XDG_CONFIG_HOME:-$HOME/.config}/rystal-shell/config.json"
```

## 2. Configuration Options

```jsonc
{
  "weather": {
    "location": "<Your preferred location; if left blank, the location will be determined from your IP address. e.g., 'New York, NY' ,'東京都練馬区'>"
  },
  "notifications": {
    "maxCount": "<Maximum number of persistent notifications; positive integer. default: 30>"
  },
  "worldClocks": [
    { "label": "<Your preferred location>", "tz": "<Timezone of that location>" },
    ... // default has 4 locations: London, Brisbane, New York, Los Angeles. You can add more or remove them as you want.
  ],
  "recorder": {
    "savePath": "<Directory to save recorded videos. default: $HOME/Videos>",
    "filenameFormat": "<Filename format for the recorded videos. default: 'recording_%Y-%m-%d_%H-%M-%S.mp4'>",
    "recordAudio": "<Boolean(true/false) value indicating whether to record audio or not. default: true>",
    "audioSource": "<Audio source for recording audio; 'system' or 'mic'. default: 'system'>"
  },
  "profile": {
    "avatarPath": "<Profile picture; 512x512 .png format is recommended. default: $HOME/Profile/Profile.png>"
  },
  "brightness": {
    "backend": "<Backend for brightness control; 'auto', 'brightnessctl', 'ddcutil'. default: 'auto'>"
  }
}
```

> [!NOTE]
> If you'd like to add new settings, feel free to open an issue or submit a pull request!
