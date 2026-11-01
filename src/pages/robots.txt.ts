import type { APIRoute } from 'astro';

// AI training and AI scraping crawlers are refused everywhere. Search
// engines (Google, Bing, DuckDuckGo) are unaffected. Known AI bots are also
// blocked outright by the Vercel firewall; this file covers the polite ones.
const aiCrawlers = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'CCBot',
  'ClaudeBot',
  'Claude-Web',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'Google-Extended',
  'GoogleOther',
  'Google-CloudVertexBot',
  'Applebot-Extended',
  'Bytespider',
  'meta-externalagent',
  'meta-externalfetcher',
  'FacebookBot',
  'PerplexityBot',
  'Perplexity-User',
  'cohere-ai',
  'cohere-training-data-crawler',
  'Amazonbot',
  'Diffbot',
  'YouBot',
  'AI2Bot',
  'Ai2Bot-Dolma',
  'MistralAI-User',
  'DuckAssistBot',
  'omgili',
  'omgilibot',
  'Timpibot',
  'ImagesiftBot',
  'img2dataset',
  'Webzio-Extended',
  'Kangaroo Bot',
  'PanguBot',
  'Scrapy',
];

export const GET: APIRoute = ({ site }) =>
  new Response(
    `# No AI training or text and data mining. See /ai.txt and /.well-known/tdmrep.json.

User-agent: *
Allow: /
Disallow: /keystatic
Disallow: /admin
Disallow: /api/

${aiCrawlers.map((bot) => `User-agent: ${bot}`).join('\n')}
Disallow: /

Sitemap: ${new URL('sitemap-index.xml', site).href}
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
