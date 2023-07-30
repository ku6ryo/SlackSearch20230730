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
  while (hasMore) {
    const result = await client.conversations.history({
      channel: channelId,
      cursor: cursor || undefined,
    })
    const { messages, has_more, response_metadata } = result
    if (response_metadata === undefined) {
      throw new Error("response_metadata is undefined")
    }
    if (messages === undefined) {
      continue
    }
    console.log(messages)
    console.log(response_metadata)
    hasMore = !!has_more
    cursor = response_metadata.next_cursor || null
  }
  process.exit(0)
})()