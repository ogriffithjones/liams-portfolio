// Editorial building blocks for long-form writing (opinion pieces and
// reviews), offered in the editor's text area. Each becomes a Markdoc tag,
// rendered by the matching component in src/components/editorial/ (see
// markdoc.config.mjs).
import { fields } from '@keystatic/core';
import { block, inline, wrapper } from '@keystatic/core/content-components';

const credit = () =>
  fields.text({
    label: 'Credit',
    description: 'Who owns the image, e.g. Paris, Texas (1984), Road Movies / 20th Century Fox',
  });

export function editorialComponents(directory: string, publicPath: string) {
  const image = (label: string) => fields.image({ label, directory, publicPath, validation: { isRequired: true } });
  return {
    figure: block({
      label: 'Image with caption',
      schema: {
        image: image('Image'),
        alt: fields.text({ label: 'Description (alt text)' }),
        caption: fields.text({ label: 'Caption', multiline: true }),
        credit: credit(),
        size: fields.select({
          label: 'Size',
          options: [
            { label: 'Text width', value: 'text' },
            { label: 'Wide', value: 'wide' },
            { label: 'Full width', value: 'full' },
          ],
          defaultValue: 'wide',
        }),
      },
    }),
    stills: block({
      label: 'Stills side by side',
      schema: {
        images: fields.array(fields.object({ image: image('Still'), alt: fields.text({ label: 'Description (alt text)' }) }), {
          label: 'Stills',
          itemLabel: (props) => props.fields.alt.value || 'Still',
        }),
        caption: fields.text({ label: 'Caption', multiline: true }),
        credit: credit(),
        columns: fields.select({
          label: 'Across',
          options: [
            { label: '2 across', value: '2' },
            { label: '3 across', value: '3' },
          ],
          defaultValue: '2',
        }),
      },
    }),
    pullQuote: block({
      label: 'Pull quote',
      schema: {
        quote: fields.text({ label: 'Quote', multiline: true }),
        attribution: fields.text({ label: 'Attribution', description: 'Optional, e.g. a character or critic' }),
      },
    }),
    video: block({
      label: 'Video clip',
      schema: {
        url: fields.url({ label: 'YouTube or Vimeo link', validation: { isRequired: true } }),
        caption: fields.text({ label: 'Caption' }),
      },
    }),
    sideNote: inline({
      label: 'Side note',
      schema: { note: fields.text({ label: 'Note', multiline: true }) },
    }),
    spoiler: wrapper({
      label: 'Spoiler',
      schema: { label: fields.text({ label: 'Warning', defaultValue: 'Spoilers' }) },
    }),
  };
}
