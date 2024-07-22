<script setup lang="ts" --module="esnext">
import OpenAI from 'openai'
import { ref } from 'vue'
import { GNAP } from 'vue3-gnap'
import SignSession from './ether-sign'
import 'vue3-gnap/dist/style.css'
import VueMarkdown from 'vue-markdown-render'

const chatHistory = ref<OpenAI.Chat.ChatCompletionMessageParam[]>([])
let isLoading = ref<boolean>(false)
let markdownContent = ''

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
const convertJSONtoMarkdown = (json: OpenAI.Chat.ChatCompletionMessageParam[]) => {
  return json
    .map((x) => {
      return `### ${x.role}:\n${x.content}\n\n`
    })
    .join('\n')
}
const SignRecord = async () => {
  const message = convertJSONtoMarkdown(chatHistory.value)
  SignSession(message).then((signature) => {
    console.log(`Signature: ${signature}`)
  })
}
async function copyToClipboard() {
  const message = convertJSONtoMarkdown(chatHistory.value)
  const theDate = new Date().toDateString()
  try {
    await navigator.clipboard.writeText(
      '## Transcript\n' +
        message +
        '## Signature\n### Signed by:  _____________________  Date: ' +
        theDate
    )
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}
</script>

<template>
  <div class="chat-area">
    <div v-for="(x, idx) in chatHistory" :class="'bubble-row ' + x.role" :key="idx">
      <div class="bubble">
        <cite>{{ x.role }}:</cite>
        <vue-markdown :source="x.content" />
      </div>
    </div>
    <vue-markdown :source="markdownContent" />
  </div>
  <div :class="'prompt ' + isLoading">
    <div class="inner">
      <input type="text" placeholder="query" id="query" @keyup.enter="sendQuery" />
      <input type="submit" value="Send" @click="sendQuery" />
      <!-- <button @click="SignRecord">Sign Record</button> -->
      <button @click="copyToClipboard">Copy Markdown</button>
    </div>
  </div>
</template>
