# Design notes and memory observations

Maybe some people are wondering, "Why AGS? Why not QuickShell?"

QuickShell was another option considered for the desktop shell.

However, I'm still a beginner with both GTK and Qt. One of the main reasons I chose AGS was that I wanted to learn GObject, one of GTK's core strengths. Since I already had experience with React, I was also interested in understanding how GTK development differs from web development.

I've been reading the GJS and Gnim documentation and doing my best to avoid memory leaks wherever possible.

> [!NOTE]
> These are historical observations, not a benchmark or memory limit. The original measurements
> did not record a revision, hardware configuration, or measurement method.

- **Typical case:**
  - `around 270 ~ 350 MB` (usually around 300 MB)

- **Worst case:**
  - `around 350 ~ 450 MB` (I have never seen it exceed around 450 MB with `maxCount = 30`)

[Back to overview](../README.md)
