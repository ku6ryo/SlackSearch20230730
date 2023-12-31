import readline from "readline"
import { textToSearchParameters } from "./textToSearchParameters"

async function main () {
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
    const args = await textToSearchParameters(text)
    console.log(args)
  }
}

main()