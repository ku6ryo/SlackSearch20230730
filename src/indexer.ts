import { WebClient } from "@slack/web-api"
import { envVar } from "./EnvVarManager"
import readline from "readline"
import { randomUUID } from "crypto"
import { QdrantClient } from "@qdrant/js-client-rest"
import { getEmbedding } from "./openai"

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
  /*
  await qdrant.createPayloadIndex(indexId, {
    field_name: "url",
    field_schema: "keyword",
    wait: true,
  })
  */
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
          const { text, postedAt, postedBy, id } = r
          const { vector } = await getEmbedding(text)
          await qdrant.upsert(indexId, {
            wait: true,
            points: [
              {
                id: randomUUID(),
                vector,
                payload: {
                  resourceId: id,
                  text,
                  postedAt,
                  postedBy,
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
      const { text, ts, user, thread_ts, files } = msg
      if (
        text === undefined ||
        ts === undefined ||
        user === undefined
      ) {
        continue
      }
      let modifiedText = text
      let fileDescription = ""
      if (files) {
        for (const file of files) {
          if (file.url_private) {
            fileDescription += file.title + "\n"
            fileDescription += file.url_private + "\n"
            fileDescription += "\n"
          }
        }
      }
      modifiedText += fileDescription
      const id = `${channelId}${thread_ts ? `:${thread_ts}` : ""}:${ts}`
      totalResults.push({
        id,
        text: modifiedText,
        postedAt: Number(ts) * 1000,
        postedBy: user,
      })
    }
    hasMore = !!has_more
    cursor = response_metadata.next_cursor || null
  }
  return totalResults
}

main()