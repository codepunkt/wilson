/**
 * @type { import('wilson').SiteConfig }
 */
module.exports = {
  siteData: {
    siteName: 'Wilson',
    siteUrl: 'https://wilsonjs.com',
    titleTemplate: '%s | Wilson',
    description: 'Blazing fast, opinionated static site generator for Preact',
    author: 'Christoph Werner',
    lang: 'en',
    twitterSite: '@wilsonjs_rocks',
    twitterCreator: '@code_punkt',
  },
  pageLayouts: [
    { pattern: 'docs/**/*', layout: 'docs' },
    { pattern: '**', layout: 'default' },
  ],
  opengraphImage: {
    background: '#ffffff',
    texts: [
      {
        font: 'src/assets/OpenSans-Regular.ttf',
        text: (frontmatter) => frontmatter?.title ?? 'Default og image title',
      },
    ],
  },
  pagination: {
    pageSize: 2,
  },
  feeds: [
    {
      title: 'Docs rss feed',
      language: 'en',
      output: 'docs/rss.xml',
      match: 'docs/**/*',
    },
  ],
}
