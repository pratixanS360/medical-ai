<script setup lang="ts" --module="esnext">
import OpenAI from 'openai'

let chatHistory: OpenAI.Chat.ChatCompletionMessageParam[] = []

const postData = async (url = '', data = {}) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  return response.json()
}
function sendQuery() {
  const input = document.getElementById('query') as HTMLInputElement
  const output = document.getElementById('output') as HTMLPreElement
  postData('/.netlify/functions/ai-chat', { chatHistory: chatHistory, newValue: input.value }).then(
    (data) => {
      chatHistory = data
      input.value = ''
      output.innerHTML = JSON.stringify(chatHistory, null, 2)
    }
  )
}
</script>

<template>
  <div class="prompt">
    <label>Enter a query:<input type="text" id="query" @keyup.enter="sendQuery" /></label>
    <input type="submit" value="Send" @click="sendQuery" />
  </div>
  <pre id="output">{{ JSON.stringify(chatHistory, false, 2) }}</pre>
</template>
