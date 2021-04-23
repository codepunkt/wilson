/**
 * @type { import('wilson').UserConfig }
 */
module.exports = {
  siteData: {
    siteName: 'Site name',
    siteUrl: 'https://example.com',
    titleTemplate: '%s | Site name',
    description: 'Site description',
    author: 'Author name',
    lang: 'en',
  },
  pageLayouts: [
    { pattern: 'blog/**/*', layout: 'blog' },
    { pattern: '**', layout: 'default' },
  ],
  opengraphImage: {
    background: '#ffffff',
    texts: [
      {
        font: 'src/assets/OpenSans-Regular.ttf',
        text: (frontmatter) => frontmatter?.title ?? 'Default opengraph title',
      },
    ],
  },
}
