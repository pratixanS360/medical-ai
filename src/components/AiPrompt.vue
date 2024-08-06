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
import { write } from 'fs'

const localStorageKey = 'noshuri'
const chatHistory = ref<OpenAI.Chat.ChatCompletionMessageParam[]>([])
const appState = {
  editBox: ref<number[]>([]),
  userName: ref<string>('Santa Claus'),
  errorMessage: ref<string>(''),
  isLoading: ref<boolean>(false),
  isError: ref<boolean>(false),
  isPreview: ref<boolean>(false),
  jwt: ref<string>('')
}

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

const urlParams = new URLSearchParams(window.location.search)
let uri = urlParams.get('uri')
if (uri && uri.length > 0) {
  localStorage.setItem(localStorageKey, uri)
} else {
  uri = localStorage.getItem(localStorageKey) || ''
}
console.log('URI', uri)
const access = [
  {
    type: 'App',
    actions: ['read'],
    locations: [uri],
    purpose: 'MAIA - Testing'
  }
]
function showJWT(jwt: string) {
  appState.jwt.value = jwt
  fetch(uri, {
    headers: {
      Authorization: `Bearer ${appState.jwt.value}`
    }
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch')
      }
      return response.text()
    })
    .then((data) => {
      console.log('Received:', data)
      chatHistory.value.push({
        role: 'system',
        content: data
      })
    })
    .catch((error) => {
      console.error(error)
    })
}
function showAuth() {
  console.log("I'm authorized!")
}
const postData = async (url = '', data = {}, headers = { 'Content-Type': 'application/json' }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  })

  try {
    return await response.json()
  } catch (error) {
    writeError('Failed to parse JSON. Probably a timeout.')
    return null
  }
}
const saveToNosh = async () => {
  appState.isLoading.value = true
  const response = await fetch(uri.replace('Timeline', 'md'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${appState.jwt.value}`
    },
    body: JSON.stringify({ content: convertJSONtoMarkdown(chatHistory.value) })
  })

  try {
    const res = await response.json()
    console.log('Received:', res)
    writeError('Saved to Nosh')
    appState.isLoading.value = false
    appState.isPreview.value = true
  } catch (error) {
    writeError('Failed to parse JSON. Probably a timeout.')
    return null
  }
}
const sendQuery = () => {
  appState.isLoading.value = true
  postData('/.netlify/functions/ai-chat', {
    chatHistory: chatHistory.value,
    newValue: formState.currentQuery
  }).then((data) => {
    appState.isLoading.value = false
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
  appState.isPreview.value = false
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
  return `Signed by: ${appState.userName.value} Date: ${new Date().toDateString()}`
}

const writeError = (message: string) => {
  appState.errorMessage.value = message
  appState.isError.value = true
  setTimeout(() => {
    appState.isError.value = false
  }, 5000)
}

const editMessage = (idx: number) => {
  appState.editBox.value.push(idx)
  return
}

const saveMessage = (idx: number, content: string) => {
  chatHistory.value[idx].content = content
  appState.editBox.value.splice(appState.editBox.value.indexOf(idx), 1)
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
        v-if="x.role !== 'system' && !appState.editBox.value.includes(idx)"
        size="8"
        :sent="x.role === 'user'"
        ><div>
          <q-btn
            dense
            flat
            size="sm"
            icon="edit"
            :class="['edit-button', x.role.toString()]"
            v-if="!appState.editBox.value.includes(idx)"
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
        v-if="appState.editBox.value.includes(idx)"
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
          @click="saveToNosh"
        ></q-btn>
      </div>
    </div>
    <div :class="'prompt ' + appState.isLoading">
      <div class="inner">
        <q-btn @click="pickFiles" flat icon="attach_file" />
        <q-input
          outlined
          placeholder="Message ChatGPT"
          v-model="formState.currentQuery"
          @keyup.enter="sendQuery"
        ></q-input>
        <q-btn
          color="primary"
          label="Send"
          @click="sendQuery"
          :loading="appState.isLoading.value"
          size="sm"
        />
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
      <p v-if="appState.isError.value">{{ appState.errorMessage.value }}</p>
    </div>
  </div>
  <q-dialog v-model="appState.isPreview.value">
    <q-card>
      <q-card-section>
        <h3>Record Saved to Nosh</h3>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          label="Cool. Got it."
          solid
          @click="
            () => {
              appState.isPreview.value = false
            }
          "
        ></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
