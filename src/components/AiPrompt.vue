<script setup lang="ts" --module="esnext">
import OpenAI from 'openai'
import { ref } from 'vue'
import SignSession from './ether-sign'
import 'vue3-gnap/dist/style.css'
import VueMarkdown from 'vue-markdown-render'

const chatHistory = ref<OpenAI.Chat.ChatCompletionMessageParam[]>([])
const theDate = new Date().toDateString()
let editBox = ref<number[]>([])
let fileinfo = {
  name: '',
  size: 0
}
let signatureContent = '### Signed by:  _____________________  Date: ' + theDate
let errorMessage = ref<string>('')
let isLoading = ref<boolean>(false)
let isFileUploaded = ref<boolean>(false)
let isError = ref<boolean>(false)

const writeError = (message: string) => {
  errorMessage.value = message
  isError.value = true
  setTimeout(() => {
    isError.value = false
  }, 5000)
}

const postData = async (url = '', data = {}) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  try {
    return await response.json()
  } catch (error) {
    writeError('Failed to parse JSON. Probably a timeout.')
    return null
  }
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

async function copyToClipboard() {
  const message = convertJSONtoMarkdown(chatHistory.value)
  try {
    await navigator.clipboard.writeText('## Transcript\n' + message + signatureContent)
  } catch (err) {
    writeError('Failed to copy to clipboard')
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
    fileinfo = file
    isFileUploaded.value = true
  } catch (error) {
    writeError('Failed to upload file')
  }
}
const editMessage = (idx: number) => {
  editBox.value.push(idx)
  return
}
const saveMessage = (idx: number, content: string) => {
  chatHistory.value[idx].content = content
  editBox.value.splice(editBox.value.indexOf(idx), 1)
  return
}
</script>

<template>
  <div class="file-upload-flag" v-if="isFileUploaded" title="File Uploaded">
    <p>File Uploaded:</p>
    <p class="file-name">{{ fileinfo.name }}</p>
    <p class="file-size">{{ fileinfo.size }}k</p>
  </div>
  <div class="chat-area">
    <div v-for="(x, idx) in chatHistory" :class="'bubble-row ' + x.role" :key="idx">
      <div class="bubble" v-if="x.role !== 'system'">
        <button
          class="edit-button"
          v-if="!editBox.includes(idx)"
          @click="editMessage(idx)"
          title="edit"
        >
          Edit
        </button>
        <cite>{{ x.role }}:</cite>
        <vue-markdown :source="x.content" v-if="!editBox.includes(idx)" />
        <div v-if="editBox.includes(idx)">
          <textarea v-model="x.content" rows="10"></textarea>
          <button class="save-button" @click="saveMessage(idx, x.content as string)">Save</button>
        </div>
      </div>
    </div>
  </div>
  <div class="signature">
    <div class="inner">
      <vue-markdown :source="signatureContent" class="signature-line" />
      <button @click="copyToClipboard">Sign and Copy Markdown</button>
    </div>
  </div>
  <div :class="'prompt ' + isLoading">
    <div class="inner">
      <label for="upload-field" class="upload-button" title="upload timeline" v-if="!isFileUploaded"
        >Upload File</label
      >
      <input type="file" id="upload-field" @change="uploadFile" />
      <input type="text" placeholder="Message ChatGPT" id="query" @keyup.enter="sendQuery" />
      <input type="submit" value="send" @click="sendQuery" />
      <!-- <button @click="SignRecord">Sign Record</button> -->
    </div>
  </div>
  <div class="error-message" v-if="isError">
    <p>{{ errorMessage }}</p>
  </div>
</template>
