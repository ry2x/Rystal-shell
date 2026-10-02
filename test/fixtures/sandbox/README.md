# Sandbox images

These two images were supplied by the user for isolated UI trials:

- `wallpaper.png`: 1920×1080 blue diagonal stripes for the background and wallpaper selector.
- `avatar.png`: 512×512 coral pattern with a centered `1:1` label for circular profile rendering.

UI sandbox runs copy them into the private wallpaper and profile directories. A private
`awww-daemon` and the bundled theme switcher apply the wallpaper, generate theme colors and create
the launcher background. The normal application and deployment do not load or ship these fixtures.

To change the trial images, replace these PNG files and restart `pnpm sandbox`.
