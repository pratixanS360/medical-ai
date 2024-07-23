<script setup lang="ts" --module="esnext">
import OpenAI from 'openai'
import { ref } from 'vue'
import { GNAP } from 'vue3-gnap'
import SignSession from './ether-sign'
import 'vue3-gnap/dist/style.css'
import VueMarkdown from 'vue-markdown-render'

const chatHistory = ref<OpenAI.Chat.ChatCompletionMessageParam[]>([])
const theDate = new Date().toDateString()
let signatureContent = '### Signed by:  _____________________  Date: ' + theDate
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
  try {
    await navigator.clipboard.writeText('## Transcript\n' + message + signatureContent)
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}
async function uploadFile() {
  const fileInput = document.getElementById('upload-field') as HTMLInputElement
  if (!fileInput.files || fileInput.files.length === 0) {
    console.error('No file selected')
    return
  }
  const file = fileInput.files[0]
  const formData = new FormData()
  formData.append('file', file)
  formData.append('chatHistory', JSON.stringify(chatHistory.value))

  try {
    const response = await fetch('/.netlify/functions/ai-chat', {
      method: 'POST',
      body: formData
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    chatHistory.value = data.chatHistory
    // You might want to display a success message here
  } catch (error) {
    console.error('Failed to upload file:', error)
    // Display an error message to the user
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
  </div>
  <div :class="'prompt ' + isLoading">
    <div class="inner">
      <label for="upload-field" class="upload-button" title="upload timeline">Upload File</label>
      <input type="file" id="upload-field" @change="uploadFile" />
      <input type="text" placeholder="query" id="query" @keyup.enter="sendQuery" />
      <input type="submit" value="Message ChatGPT" @click="sendQuery" />
      <!-- <button @click="SignRecord">Sign Record</button> -->
    </div>
  </div>
  <div class="signature">
    <div class="inner">
      <vue-markdown :source="signatureContent" class="signature-line" />
      <button @click="copyToClipboard">Sign and Copy Markdown</button>
    </div>
  </div>
</template>
