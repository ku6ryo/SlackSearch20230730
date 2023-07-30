import { ChatCompletionFunctions } from "openai"
import { getChatCompletionWithFuncs } from "../openai"
import { Validator } from "jsonschema"

const parameterObjectDef = {
  type: "object",
  properties: {
    explanations: {
      type: "array",
      description: "Explanations of the file or web page. Please do not include the URL in the explanations. Please do not explanation of URL parameters.",
      items: {
        type: "string",
      }
    }
  }
}

export const functions: ChatCompletionFunctions[] = [
  {
    name: "store-explanations",
    description: "Store explanations of a file or web page.",
    parameters: parameterObjectDef,
  },
]

function isFunctionArgs(args: any): args is { explanations: string[] } {
  const v = new Validator()
  const r = v.validate(args, parameterObjectDef)
  return r.valid
}

export async function explainUrl(url: string, text: string) {
  const result = await getChatCompletionWithFuncs([{
    role: "assistant",
    content: `You are an assistant who stores explanations of contents in a URL (maybe a file or web page). Current time is ${new Date().toISOString()}}`,
  }, {
    role: "user",
    content: `
    Please explain what content can be accessed via the URL according to the chat message where the URL is shared.
    The explanation should be given in the language of the chat message.
URL: ${url}

Chat message:
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