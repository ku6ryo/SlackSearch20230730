import { WebClient } from "@slack/web-api"
import { envVar } from "./EnvVarManager"
import readline from "readline"

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  const channelId = await new Promise<string>((resolve) => {
    rl.question("Channel ID: ", function(input) {
      resolve(input)
    })
  })
  const slack = new WebClient(envVar.slackBotToken())

  let cursor: string | null = null
  let hasMore = true

  while (hasMore) {
    const result = await slack.conversations.history({
      channel: channelId,
      cursor: cursor || undefined,
    });
    const { messages, has_more, response_metadata } = result
    if (response_metadata === undefined) {
      throw new Error("response_metadata is undefined")
    }
    if (messages === undefined) {
      continue
    }
    const filtered = messages.filter((msg) => {
      return msg.type === "message" && msg.subtype === undefined
    })
    hasMore = !!has_more
    cursor = response_metadata.next_cursor || null
    for (const msg of filtered) {
      if (msg.ts) {
        await fetchReplies(channelId, msg.ts)
      }
    }
  }
  process.exit(0)
}


async function fetchReplies(channelId: string, ts: string) {
  const client = new WebClient(envVar.slackBotToken())
  let cursor: string | null = null;
  let hasMore = true
  const totalResults: { id: string, text: string, postedAt: number, postedBy: string }[] = []
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
      if (msg.files) {
        console.log(msg)
      }
      const { text, ts, user, thread_ts } = msg
      if (
        text === undefined ||
        ts === undefined ||
        user === undefined
      ) {
        continue
      }
      const id = `${channelId}${thread_ts ? `:${thread_ts}` : ""}:${ts}`
      totalResults.push({
        id,
        text,
        postedAt: Number(thread_ts || ts) * 1000,
        postedBy: user,
      })
    }
    hasMore = !!has_more
    cursor = response_metadata.next_cursor || null
  }
  return totalResults
}

main()