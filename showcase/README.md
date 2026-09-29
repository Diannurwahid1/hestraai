# Hestra AI — 60-second product film

Editable Remotion source for a 1920 × 1080, 30 fps showcase of the live Hestra AI product. The film combines motion graphics, product-owned brand artwork, a procedurally generated original instrumental score, and captures from the live product recorded on 24 September 2026. The research numbers shown are those visible in the product capture; no extra metrics were authored for the film.

## Render

```bash
npm install
npm run typecheck
npm run render
```

The render command generates the score and writes `out/hestra-ai-showcase-v2.mp4`. Run `npm run studio` to edit or preview scenes. The project is exactly 1,800 frames / 60 seconds. It has on-screen English copy and instrumental music, without voice-over. Each product scene now uses a distinct camera path and one of three compositions: text-left, text-right, or wide evidence view.

## Product-capture notes

The captures in `public/screens` are real sessions of `https://hestra-ai.diannurwahid.com`; they are not an interactive browser recording. Account-identifying names were hidden in the featured frames. One investigation and one AI answer were created in the live account for the film. No API key or login credential is stored in this project.

## Remotion licensing

Review [Remotion's license FAQ](https://www.remotion.dev/docs/license/faq) before commercial production or distribution. License requirements depend on the organization and use case.
