import { Message } from "@slack/web-api/dist/response/ConversationsRepliesResponse"

export type ParsedMessage = {
  ts: string
  text: string
  textToIndex: string
  postedAt: number
  postedBy: string
  sharedWith: string[]
}

export function parseMessage(msg: Message): ParsedMessage {
  const { text, ts, user, thread_ts, files, attachments } = msg
  if (
    text === undefined ||
    ts === undefined ||
    user === undefined
  ) {
    throw new Error("text, ts, or user is undefined")
  }
  let textToIndex = text
  let attachmentDescriptions: string[] = []
  if (attachments) {
    for (const attachment of attachments) {
      if (attachment.original_url) {
        attachmentDescriptions.push(attachment.title + "\n" + attachment.original_url)
      } else if (attachment.is_app_unfurl) {
        attachmentDescriptions.push(attachment.title + "\n" + attachment.app_unfurl_url)
      }
    }
  }
  let fileDescriptions: string[] = []
  if (files) {
    for (const file of files) {
      if (file.url_private) {
        fileDescriptions.push(file.title + "\n" + file.url_private)
      }
    }
  }
  if (attachmentDescriptions.length > 0) {
    textToIndex += "\n\n" + attachmentDescriptions.join("\n")
  }
  if (fileDescriptions.length > 0) {
    textToIndex += "\n\n" + fileDescriptions.join("\n")
  }
  const mentionedUserIds = (() => {
    const m = text.match(/<@([A-Z0-9]+)>/g)
    if (!m) {
      return []
    }
    const ids = [] as string[]
    for (const match of m) {
      const id = match.match(/<@([A-Z0-9]+)>/)![1]
      ids.push(id)
    }
    return ids
  })()
  return {
    ts,
    textToIndex,
    text,
    postedAt: Number(thread_ts || ts) * 1000,
    postedBy: user,
    sharedWith: mentionedUserIds,
  }
}