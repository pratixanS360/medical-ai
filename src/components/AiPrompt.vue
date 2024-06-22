<script setup lang="ts" --module="esnext">
import OpenAI from 'openai'

const chatHistory: OpenAI.Chat.ChatCompletionMessageParam[] = []

const openai = new OpenAI({
  organization: import.meta.env.VITE_ORG_ID as string,
  project: import.meta.env.VITE_PROJECT_ID as string,
  apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
  dangerouslyAllowBrowser: true
})
function sendQuery() {
  const input = document.getElementById('query') as HTMLInputElement
  const output = document.getElementById('output') as HTMLPreElement
  chatHistory.push({ role: 'user', content: input.value || '' })
  input.value = ''
  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    messages: chatHistory,
    model: 'gpt-3.5-turbo'
  }
  openai.chat.completions.create(params).then((response) => {
    chatHistory.push(response.choices[0].message)
    output.innerHTML = JSON.stringify(chatHistory, null, 2)
  })
}
</script>

<template>
  <div class="prompt">
    <label>Enter a query:<input type="text" id="query" @keyup.enter="sendQuery" /></label>
    <input type="submit" value="Send" @click="sendQuery" />
  </div>
  <pre id="output">{{ JSON.stringify(chatHistory, false, 2) }}</pre>
</template>
