import { WebClient } from "@slack/web-api"
import { envVar } from "./EnvVarManager"
import readline from "readline"
import { writeFileSync } from "fs"
import { ParsedMessage, parseMessage } from "./parseMessage"

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

  const allMessages: ParsedMessage[][] = []
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
        const results = await fetchReplies(channelId, msg.ts)
        allMessages.push(results)
      }
    }
  }
  console.log(allMessages)
  writeFileSync("out.txt", allMessages.flat().map((msg) => {
    return `${msg.ts}\n${msg.textToIndex}`
  }).join("\n====================\n"))

  process.exit(0)
}


async function fetchReplies(channelId: string, ts: string): Promise<ParsedMessage[]> {
  const client = new WebClient(envVar.slackBotToken())
  let cursor: string | null = null;
  let hasMore = true
  const parsedMessages: ParsedMessage[] = []
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
      if (
        text === undefined ||
        ts === undefined ||
        user === undefined
      ) {
        continue
      }
      parsedMessages.push(parseMessage(msg))
    }
    hasMore = !!has_more
    cursor = response_metadata.next_cursor || null
  }
  return parsedMessages
}

main()