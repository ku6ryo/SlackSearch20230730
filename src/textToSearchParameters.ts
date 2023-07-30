import { ChatCompletionFunctions } from "openai"
import { getChatCompletionWithFuncs } from "./openai"
import { Validator } from "jsonschema"
import { FromSchema } from "json-schema-to-ts"

const parameterObjectDef = {
  type: "object",
  properties: {
    category: {
      type: "string",
      description: "Category of what to search.",
      enum: ["file", "thread"],
    },
    whatToSearch: {
      type: "string",
      description: "What a user is searching. e.g. financial report. If it includes time, please change it to ISO 8601 format.",
    },
    postedAt: {
      type: "object",
      description: "Time range when the file was shared. Please note that this is not the time that the file is for. e.g. a file about 2020 financial report can be shared in 2021. In that case, the time range is 2021. If the range is unclear, please leave it blank.",
      properties: {
        from: {
          type: "string",
          description: "ISO 8601 format. Please include the last letter Z. e.g. 2021-01-01T00:00:00.000Z",
        },
        to: {
          type: "string",
          description: "ISO 8601 format. Please include the last letter Z. e.g. 2021-01-01T00:00:00.000Z",
        },
      }
    },
    postedBy: {
      type: "string",
      description: "Who posted the message. e.g. U05BB4MRGKX . remove @ from the beginning.",
    },
    sharedWith: {
      type: "string",
      description: "With whom the message shared. e.g. U05BB4MRGKX . remove @ from the beginning.",
    },
  },
} as const

type ParameterObjectType = FromSchema<typeof parameterObjectDef>

export const functions: ChatCompletionFunctions[] = [
  {
    name: "search-text-chat",
    description: "Searches files or chat threads. Please leave parameters blank if you don't know.",
    parameters: parameterObjectDef,
  },
]

function isFunctionArgs(args: any): args is ParameterObjectType {
  const v = new Validator()
  const r = v.validate(args, parameterObjectDef as any)
  return r.valid
}

export async function textToSearchParameters(text: string) {
  const result = await getChatCompletionWithFuncs([{
    role: "system",
    content: `You are an assistant who search threads and files in Slack. Current time is ${new Date().toISOString()}}`,
  }, {
    role: "user",
    content: text,
  }], functions)
  if (!result.functionCall) {
    return null
  }
  const { arguments: argsStr, name } = result.functionCall
  if (name !== "search-text-chat") {
    return null
  }
  if (!argsStr) {
    return null
  }
  const args = JSON.parse(argsStr)
  if (!isFunctionArgs(args)) {
    return null
  }
  return args
}