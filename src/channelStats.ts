import { WebClient } from "@slack/web-api"
import { envVar } from "./EnvVarManager"
import readline from "readline"

;(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  const channelId = await new Promise<string>((resolve) => {
    rl.question("Channel ID: ", function(input) {
      resolve(input)
    })
  })
  const client = new WebClient(envVar.slackBotToken())
  let cursor: string | null = null
  let hasMore = true
  const messageStatsGroup: { count: number, countWithoutUrl: number }[][] = []
  while (hasMore) {
    const result = await client.conversations.history({
      channel: channelId,
      cursor: cursor || undefined,
    })
    const { messages, has_more, response_metadata, } = result
    if (response_metadata === undefined) {
      throw new Error("response_metadata is undefined")
    }
    if (messages === undefined) {
      continue
    }
    hasMore = !!has_more
    cursor = response_metadata.next_cursor || null
    for (const msg of messages) {
      const { ts } = msg
      if (ts === undefined) {
        continue
      }
      const stats = await fetchReplies(channelId, ts)
      messageStatsGroup.push(stats)
    }
  }
  const avgCount = messageStatsGroup.flat().reduce((acc, cur) => {
    return acc + cur.count
  }, 0) / messageStatsGroup.flat().length
  const avgCountWithoutUrl = messageStatsGroup.flat().reduce((acc, cur) => {
    return acc + cur.countWithoutUrl
  }, 0) / messageStatsGroup.flat().length
  console.log("Total messages: ", messageStatsGroup.flat().length)
  console.log("Average characters count / message: ", avgCount)
  console.log("Average characters count wihtout URL / message: ", avgCountWithoutUrl)
  process.exit(0)
})()

async function fetchReplies(channelId: string, ts: string) {
  const client = new WebClient(envVar.slackBotToken())
  let cursor: string | null = null;
  let hasMore = true
  const messageStats: { count: number, countWithoutUrl: number }[] = []
  while (hasMore) {
    const result = await client.conversations.replies({
      channel: channelId,
      ts: ts,
      cursor: cursor || undefined,
    })
    const { messages, has_more, response_metadata } = result
    if (response_metadata === undefined) {
      throw new Error("response_metadata is undefined")
    }
    if (messages === undefined) {
      throw new Error("messages is undefined")
    }
    const filtered = messages.filter((msg) => {
      return msg.type === "message"
    })
    for (const msg of filtered) {
      const { text, ts, user } = msg
      if (text === undefined || ts === undefined || user === undefined) {
        console.log("skipping because of undefined properties")
        continue
      }
      const textWithoutUrl = text.replace(/<https?:\/\/[^>]+>/g, "")
      messageStats.push({ count: text.length, countWithoutUrl: textWithoutUrl.length })
    }
    hasMore = !!has_more
    cursor = response_metadata.next_cursor || null
  }
  return messageStats
}