# Department of Agriculture: services promo (~46s, 1920×1080)

- **Voiceover:** ElevenLabs, voice "Peter – South African Commercial", model eleven_v4.
  Flow: https://elevenlabs.io/app/flows/0MmNJUbgYCfq4n1c1Fu9 (two takes: 42.9s and 44.1s)
- **Visuals:** `scene.html`, an animated page driven by a time value. `render.mjs` steps it frame by frame with Playwright and encodes the result with ffmpeg.

## Build

```bash
node render.mjs voiceover.mp3 dept-agriculture-promo.mp4
```

The script finds the pauses in the voiceover, starts each scene on its paragraph and syncs the captions to it.
Run it with no audio file to get a silent version with estimated timings. Add `--preview` to get one PNG per scene.

## Script
1. From the soil to the table, the Department of Agriculture works for every farmer, and every family in South Africa.
2. We support producers, big and small, with funding, training, and extension officers right there on the ground.
3. We protect the nation's herds and harvests through animal and plant health services, keeping disease out and keeping our food safe.
4. We open doors to new markets, at home and abroad, so South African produce reaches the world.
5. And we invest in research and innovation, helping farms adapt to a changing climate.
6. Because a strong agricultural sector means jobs, food security, and thriving rural communities.
7. The Department of Agriculture. Growing South Africa, together.
