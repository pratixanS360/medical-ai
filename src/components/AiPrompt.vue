<script setup lang="ts" --module="esnext">
import OpenAI from 'openai'
import { ref } from 'vue'
import { GNAP } from 'vue3-gnap'
import 'vue3-gnap/dist/style.css'

const chatHistory = ref<OpenAI.Chat.ChatCompletionMessageParam[]>([])
let isLoading = ref<boolean>(false)

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
const sendQuery = () => {
  isLoading.value = true
  const input = document.getElementById('query') as HTMLInputElement
  postData('/.netlify/functions/ai-chat', {
    chatHistory: chatHistory.value,
    newValue: input.value
  }).then((data) => {
    isLoading.value = false
    chatHistory.value = data
    input.value = ''
  })
}
</script>

<template>
  <div class="chat-area">
    <div v-for="(x, idx) in chatHistory" :class="'bubble-row ' + x.role" :key="idx">
      <div class="bubble">
        <cite>{{ x.role }}:</cite>
        <p>{{ x.content }}</p>
      </div>
    </div>
  </div>
  <div :class="'prompt ' + isLoading">
    <div class="inner">
      <input type="text" placeholder="query" id="query" @keyup.enter="sendQuery" />
      <input type="submit" value="Send" @click="sendQuery" />
      <GNAP
        helper="blue large"
        location="https://nosh-app-mj3xd.ondigitalocean.app/app/"
        server="https://shihjay.xyz/api/as"
      />
    </div>
  </div>
</template>
