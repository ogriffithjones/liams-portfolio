import { component, defineMarkdocConfig } from '@astrojs/markdoc/config';

// Editorial blocks from the editor (src/lib/editorial.ts) → site components
const text = { type: String };

export default defineMarkdocConfig({
  tags: {
    figure: {
      render: component('./src/components/editorial/Figure.astro'),
      attributes: { image: text, alt: text, caption: text, credit: text, size: text },
    },
    stills: {
      render: component('./src/components/editorial/Stills.astro'),
      attributes: { images: { type: Array }, caption: text, credit: text, columns: text },
    },
    pullQuote: {
      render: component('./src/components/editorial/PullQuote.astro'),
      attributes: { quote: text, attribution: text },
    },
    video: {
      render: component('./src/components/editorial/Video.astro'),
      attributes: { url: text, caption: text },
    },
    sideNote: {
      render: component('./src/components/editorial/SideNote.astro'),
      attributes: { note: text },
      inline: true,
    },
    spoiler: {
      render: component('./src/components/editorial/Spoiler.astro'),
      attributes: { label: text },
    },
  },
});
