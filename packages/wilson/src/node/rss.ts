import { getConfig } from './config'
import RSS from 'rss'
import { getContentPageSources } from './state'
import minimatch from 'minimatch'
import { cleanUrl, toRoot, writeFile } from './util'
import { ContentPageSource } from './page-source'
import { Feed } from '../types'

const defaultOptions = {
  language: 'en',
  match: '**',
}

export async function createRssFeed(): Promise<Feed[]> {
  const {
    feeds: feedConfigs,
    siteData: { description, siteUrl },
  } = getConfig()

  const result: Feed[] = []

  for (const opts of feedConfigs) {
    /**
     * @todo image_url? test in feed readers!
     * @todo pubsubhubbub? https://github.com/pubsubhubbub/PubSubHubbub
     *  websub https://github.com/w3c/websub
     */
    const options = { ...defaultOptions, ...opts }
    const feedUrl = cleanUrl(`${siteUrl}/${options.output}`)

    result.push({ href: feedUrl, title: options.title })

    const feed = new RSS({
      title: options.title,
      feed_url: feedUrl,
      site_url: siteUrl,
      description,
      generator: 'Wilson',
      managingEditor: options.managingEditor,
      webMaster: options.webMaster,
      copyright: options.copyright,
      language: options.language,
      pubDate: new Date(),
      ttl: options.ttl,
    })

    const feedPageSources: ContentPageSource[] = []

    for (const pageSource of getContentPageSources()) {
      if (typeof options.match === 'string') {
        minimatch(pageSource.path, options.match) &&
          feedPageSources.push(pageSource)
      } else if (typeof options.match === 'function') {
        options.match(pageSource.frontmatter) &&
          feedPageSources.push(pageSource)
      }
    }

    const sortedFeedPageSources = feedPageSources.sort(
      (a, b) => b.pages[0].date.getTime() - a.pages[0].date.getTime()
    )

    for (const {
      pages: [{ date, description, route, title }],
    } of sortedFeedPageSources) {
      feed.item({
        date,
        title,
        description: description ?? title,
        url: cleanUrl(`${siteUrl}/${route}`),
      })
    }

    await writeFile(
      toRoot(`./dist/${options.output}`),
      feed.xml({ indent: true })
    )
  }

  return result
}
