/**
 * @type { import('wilson').Options }
 */
module.exports = {
  siteMetadata: {
    titleTemplate: '%s | Wilson',
    description: 'Blazing fast, opinionated static site generator for Preact',
    author: 'Christoph Werner',
    lang: 'en',
  },
  opengraphImage: {
    background: '#ffffff',
    texts: [
      {
        font: 'src/assets/OpenSans-Regular.ttf',
        text: (frontmatter) => frontmatter?.title ?? 'Default og image title',
      },
    ],
  },
}
