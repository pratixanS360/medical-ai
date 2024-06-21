<script setup lang="ts">
defineProps<{
  msg: string
}>()
import OpenAI from 'openai'

const chatHistory: { role: string; content: string }[] = []

const openai = new OpenAI({
  organization: import.meta.env.VITE_ORG_ID as string,
  project: import.meta.env.VITE_PROJECT_ID as string,
  apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
  dangerouslyAllowBrowser: true
})
function sendQuery() {
  const input = document.getElementById('query')
  const chatwindow = document.querySelector('#chatwindow pre') || document.createElement('div')

  const chatEvent = { role: 'user', content: input.value || '' }
  chatHistory.push(chatEvent)
  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    messages: chatHistory,
    model: 'gpt-3.5-turbo'
  }
  openai.chat.completions.create(params).then((response) => {
    chatHistory.push(response.choices[0].message)
    chatwindow.innerHTML = JSON.stringify(chatHistory, false, 2)
  })
}
</script>

<template>
  <div class="prompt">
    <label>Enter a query:<input type="text" id="query" @keyup.enter="sendQuery" /></label>
    <input type="submit" value="Send" @click="sendQuery" />
  </div>
  <div id="chatwindow">
    <pre>{{ chatCompletion }}</pre>
  </div>
</template>
