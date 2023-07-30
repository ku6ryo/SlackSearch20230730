import { WebClient } from "@slack/web-api"
import { envVar } from "./EnvVarManager"
import readline from "readline"
import { QdrantClient } from "@qdrant/js-client-rest";
import { getEmbedding } from "./openai";
import { textToSearchParameters } from "./textToSearchParameters";

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  const qdrant = new QdrantClient({
    url: envVar.qdrantUrl()
  })
  const indexId = await new Promise<string>((resolve) => {
    rl.question("Index ID: ", function(input) {
      resolve(input)
    })
  })
  while (true) {
    const query = await new Promise<string>((resolve) => {
      rl.question("Query: ", function(input) {
        resolve(input)
      })
    })
    const funcArgs = await textToSearchParameters(query)
    console.log(funcArgs)
    let searchText = query
    let from: number | null  = null
    let to: number | null = null
    let postedBy: string | null = null
    let sharedWith: string | null = null
    if (funcArgs) {
      if (funcArgs.whatToSearch) {
        searchText = funcArgs.whatToSearch
      }
      if (funcArgs.postedAt) {
        if (funcArgs.postedAt.from) {
          from = new Date(funcArgs.postedAt.from).getTime()
        }
        if (funcArgs.postedAt.to) {
          to = new Date(funcArgs.postedAt.to).getTime()
        }
        if (from !== null && to !== null) {
          from -= (from - to) * 0.1
          to += (to - from) * 0.1
        } else if (from !== null) {
          from -= 1000 * 60 * 60 * 24 * 7
        } else if (to !== null) {
          to += 1000 * 60 * 60 * 24 * 7
        }
      }
      if (funcArgs.postedBy) {
        postedBy = funcArgs.postedBy
      }
      if (funcArgs.sharedWith) {
        sharedWith = funcArgs.sharedWith
      }
    }
    const conditions: any[] = []
    if (from || to) {
      conditions.push({
        key: "postedAt",
        range: {
          gte: from,
          lte: to,
        }
      })
    }
    if (postedBy) {
      conditions.push({
        key: "postedBy",
        match: {
          value: postedBy,
        }
      })
    }
    if (sharedWith) {
      conditions.push({
        key: "sharedWith",
        match: {
          value: sharedWith,
        }
      })
    }
    console.log(conditions)
    const { vector } = await getEmbedding(searchText)
    const results = await qdrant.search(indexId, {
      vector,
      limit: 10,
      filter: {
        must: conditions,
      }
    })
    for (let i = 0; i < results.length; i++) {
      const res = results[i]
      const { text, resourceId } = res.payload as { resourceId: string, text: string }
      console.log("====================================")
      console.log(`${i}: ${resourceId}`)
      console.log(text)
      const match = text.match(/https?:\/\/[^\s|>]+/g)
      if (match) {
        for (let i = 0; i < match.length; i++) {
          console.log(`[${i}] ${match[i]}`)
        }
      }
    }
    console.log("")
    console.log("")
  }
}

main()