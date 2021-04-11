module.exports = {
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
