import readline from "readline"
import { extractUrls } from "./indexer/extractUrls"

;(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  while (true) {
    const text = await new Promise<string>((resolve) => {
      rl.question("input: ", function(input) {
        resolve(input)
      })
    })
    const args = await extractUrls(text)
    console.log(args)
  }
})()