import type { ChatHistoryItem } from '@/types'

export const convertJSONtoMarkdown = (json: ChatHistoryItem[], username: string): string => {
  return (
    '### Transcript\n' +
    json
      .map((x) => {
        if (x.role !== 'system') {
          return `##### ${x.role}:\n${x.content}`
        }
      })
      .join('\n') +
    '\n\n##### ' +
    signatureContent(username)
  )
}

export const getSystemMessageType = (message: string): string => {
  const splitpiece = message.split('\n')[0]
  if (splitpiece.includes('timeline')) {
    return 'timeline'
  } else {
    const fileInfo = JSON.parse(splitpiece)
    return `${fileInfo.filename} uploaded.\n\n${fileInfo.size}`
  }
}

export const signatureContent = (username: string): string => {
  return `Signed by: ${username} Date: ${new Date().toDateString()}`
}

export const postData = async (
  url = '',
  data = {},
  headers = { 'Content-Type': 'application/json' }
) => {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  })

  try {
    return await response.json()
  } catch (error) {
    console.error('Failed to parse JSON. Probably a timeout.')
    return null
  }
}

export const pickFiles = () => {
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
  if (fileInput) {
    fileInput.click()
  }
}
