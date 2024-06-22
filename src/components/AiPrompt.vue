<script setup lang="ts" --module="esnext">
import OpenAI from 'openai'
import { ref } from 'vue'

const chatHistory = ref<OpenAI.Chat.ChatCompletionMessageParam[]>([])

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
  postData('/.netlify/functions/ai-chat', {
    chatHistory: chatHistory.value.reverse(),
    newValue: input.value
  }).then((data) => {
    chatHistory.value = data.reverse()
    input.value = ''
  })
}
</script>

<template>
  <div class="prompt">
    <label>Enter a query:<input type="text" id="query" @keyup.enter="sendQuery" /></label>
    <input type="submit" value="Send" @click="sendQuery" />
  </div>
  <div class="chat-area">
    <div v-for="x in chatHistory" :key="x" :class="'bubble-row ' + x.role">
      <div class="bubble">
        <cite>{{ x.role }}:</cite>
        <p>{{ x.content }}</p>
      </div>
    </div>
  </div>
</template>
