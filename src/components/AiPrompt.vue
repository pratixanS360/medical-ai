<script setup lang="ts" --module="esnext">
import OpenAI from 'openai'
import { ref } from 'vue'
import VueMarkdown from 'vue-markdown-render'
import { reactive } from 'vue'
import {
  QBtn,
  QFile,
  QIcon,
  QChatMessage,
  QInput,
  QDialog,
  QCard,
  QCardSection,
  QCardActions
} from 'quasar'
import { GNAP } from 'vue3-gnap'

const chatHistory = ref<OpenAI.Chat.ChatCompletionMessageParam[]>([])
let editBox = ref<number[]>([])
let Username = ref<string>('Santa Claus')
let errorMessage = ref<string>('')
let isLoading = ref<boolean>(false)
let isError = ref<boolean>(false)
let isPreview = ref<boolean>(false)

type QueryFormState = {
  currentQuery: string | null
}
type FileFormState = {
  file: File | null
}
const formState = reactive(<QueryFormState>{
  currentQuery: null
})
const fileFormState = reactive(<FileFormState>{
  file: null
})
const access = [
  {
    type: 'App',
    actions: ['read', 'write'],
    locations: [
      'https://nosh-app-mj3xd.ondigitalocean.app/app/chart/nosh_2c23641c-c1b4-4f5c-92e8-c749c54a34da'
    ],
    purpose: 'Clinical - Routine'
  }
]
function showJWT(jwt: string) {
  console.log(jwt)
}
function showAuth() {
  console.log("I'm authorized!")
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
  postData('/.netlify/functions/ai-chat', {
    chatHistory: chatHistory.value,
    newValue: formState.currentQuery
  }).then((data) => {
    isLoading.value = false
    chatHistory.value = data
    formState.currentQuery = ''
    setTimeout(() => {
      window.scrollTo(0, document.body.scrollHeight)
    }, 100)
  })
}

const convertJSONtoMarkdown = (json: OpenAI.Chat.ChatCompletionMessageParam[]) => {
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
    signatureContent()
  )
}

async function copyToClipboard() {
  closePopup()
  const message = convertJSONtoMarkdown(chatHistory.value)
  try {
    await navigator.clipboard.writeText(message)
    writeError('Copied to clipboard')
  } catch (err) {
    writeError('Failed to copy to clipboard')
  }
}

async function uploadFile(e: Event) {
  let fileInput = e.target as HTMLInputElement
  if (!fileInput.files || fileInput.files.length === 0) {
    writeError('No file selected')
    return
  }
  const formData = new FormData()
  formData.append('file', fileInput.files[0])
  formData.append('chatHistory', JSON.stringify(chatHistory.value))

  try {
    const response = await fetch('/.netlify/functions/ai-chat', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      writeError('Failed to upload file')
      return
    }
    const data = response.json()
    chatHistory.value = data.chatHistory || []
  } catch (error) {
    writeError('Failed to upload file')
  }
}

const signatureContent = () => {
  return `Signed by: ${Username.value} Date: ${new Date().toDateString()}`
}

const writeError = (message: string) => {
  errorMessage.value = message
  isError.value = true
  setTimeout(() => {
    isError.value = false
  }, 5000)
}

const closePopup = () => {
  isPreview.value = false
}

const openPopup = () => {
  isPreview.value = true
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

const pickFiles = () => {
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
  if (fileInput) {
    fileInput.click()
  }
}
</script>

<template>
  <div :class="{ 'file-exists': fileFormState.file, 'file-upload-area': true }">
    <q-file v-model="fileFormState.file" filled counter multiple append @input="uploadFile">
      <template v-slot:prepend>
        <q-icon name="attach_file"></q-icon>
      </template>
    </q-file>
  </div>
  <div class="chat-area" id="chat-area">
    <div v-for="(x, idx) in chatHistory" :key="idx">
      <q-chat-message
        :name="x.role"
        v-if="x.role !== 'system' && !editBox.includes(idx)"
        size="8"
        :sent="x.role === 'user'"
        ><div>
          <q-btn
            dense
            flat
            size="sm"
            icon="edit"
            :class="['edit-button', x.role.toString()]"
            v-if="!editBox.includes(idx)"
            @click="editMessage(idx)"
          ></q-btn>
          <vue-markdown :source="x.content" />
        </div>
      </q-chat-message>
      <q-chat-message
        size="8"
        class="edit-chat"
        :name="x.role"
        :sent="x.role === 'user'"
        v-if="editBox.includes(idx)"
        ><div>
          <textarea v-model="x.content as string" rows="10" />
          <q-btn
            size="sm"
            icon="save"
            color="primary"
            label="Save"
            @click="saveMessage(idx, x.content as string)"
          />
        </div>
      </q-chat-message>
    </div>
  </div>
  <div class="bottom-toolbar">
    <div class="signature">
      <div class="inner">
        <q-btn
          size="sm"
          color="secondary"
          label="Sign and Copy Markdown"
          @click="openPopup"
        ></q-btn>
      </div>
    </div>
    <div :class="'prompt ' + isLoading">
      <div class="inner">
        <q-btn @click="pickFiles" flat icon="attach_file" />
        <q-input
          outlined
          placeholder="Message ChatGPT"
          v-model="formState.currentQuery"
          @keyup.enter="sendQuery"
        ></q-input>
        <q-btn color="primary" label="Send" @click="sendQuery" :loading="isLoading" size="sm" />
        <GNAP
          @on-authorized="showAuth"
          @jwt="showJWT"
          helper="blue large"
          :access="access"
          server="https://shihjay.xyz/api/as"
        />
      </div>
    </div>
    <div class="error-message">
      <p v-if="isError">{{ errorMessage }}</p>
    </div>
  </div>
  <q-dialog v-model="isPreview">
    <q-card>
      <q-card-section>
        <vue-markdown :source="convertJSONtoMarkdown(chatHistory)" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn label="Cancel" solid color="warning" @click="closePopup"></q-btn>
        <q-btn :label="signatureContent()" solid color="primary" @click="copyToClipboard"></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
