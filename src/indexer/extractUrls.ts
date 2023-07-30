import { ChatCompletionFunctions } from "openai"
import { getChatCompletionWithFuncs } from "../openai"
import { Validator } from "jsonschema"

const parameterObjectDef = {
  type: "object",
  properties: {
    urls: {
      type: "array",
      items: {
        properties: {
          url: {
            type: "string",
            description: "URL of the file.",
          },
          explanations: {
            type: "string",
            description: "Explanation of the URL.",
          },
        }
      }
    }
  },
}

export const functions: ChatCompletionFunctions[] = [
  {
    name: "store-file-url",
    description: "Store URLs of files from text chat and explain them.",
    parameters: parameterObjectDef,
  },
]

function isFunctionArgs(args: any): args is { urls: { url: string, explanations: string }[] } {
  const v = new Validator()
  const r = v.validate(args, parameterObjectDef)
  return r.valid
}

export async function extractUrls(text: string) {
  const result = await getChatCompletionWithFuncs([{
    role: "assistant",
    content: `You are an assistant who stores file urls to a storage Current time is ${new Date().toISOString()}}`,
  }, {
    role: "user",
    content: `
    Please extract URLs from the text below and store.

text to extract:
${text}
    `,
  }], functions)
  console.log(result)
  if (!result.functionCall) {
    return null
  }
  const { arguments: argsStr } = result.functionCall
  if (!argsStr) {
    return null
  }
  const args = JSON.parse(argsStr)
  if (!isFunctionArgs(args)) {
    return null
  }
  return args
}