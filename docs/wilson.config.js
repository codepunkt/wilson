/**
 * @type { import('wilson').Options }
 */
module.exports = {
  siteMetadata: {
    siteName: 'Wilson',
    siteUrl: 'https://wilsonjs.com',
    titleTemplate: '%s | Wilson',
    description: 'Blazing fast, opinionated static site generator for Preact',
    author: 'Christoph Werner',
    lang: 'en',
    twitterSite: '@wilsonjs_rocks',
    twitterCreator: '@code_punkt',
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
