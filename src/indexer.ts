import { WebClient } from "@slack/web-api"
import { envVar } from "./EnvVarManager"
import readline from "readline"
import { randomUUID } from "crypto"
import { QdrantClient } from "@qdrant/js-client-rest"
import { getEmbedding } from "./openai"
import { ParsedMessage, parseMessage } from "./parseMessage"

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  const indexId = randomUUID()
  console.log(`Index ID: ${indexId}`)
  const qdrant = new QdrantClient({
    url: envVar.qdrantUrl()
  })
  await qdrant.createCollection(indexId, {
    vectors: {
      size: 1536,
      distance: "Cosine",
    }
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
        const results = await fetchReplies(channelId, msg.ts)
        for (const r of results) {
          const { textToIndex, postedAt, postedBy, ts, sharedWith } = r
          const { vector } = await getEmbedding(textToIndex)
          await qdrant.upsert(indexId, {
            wait: true,
            points: [
              {
                id: randomUUID(),
                vector,
                payload: {
                  resourceId: ts,
                  text: textToIndex,
                  postedAt,
                  postedBy,
                  sharedWith,
                },
              },
            ],
          })
        }
      }
    }
  }
  console.log("Index ID: ", indexId)
  process.exit(0)
}


async function fetchReplies(channelId: string, ts: string) {
  const client = new WebClient(envVar.slackBotToken())
  let cursor: string | null = null;
  let hasMore = true
  const totalResults: ParsedMessage[] = []
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
      const m = parseMessage(msg)
      totalResults.push(m)
    }
    hasMore = !!has_more
    cursor = response_metadata.next_cursor || null
  }
  return totalResults
}

main()