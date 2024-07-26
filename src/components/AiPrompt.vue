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
  QCardActions,
  is
} from 'quasar'

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
    '##### Transcript\n\n\n' +
    json
      .map((x) => {
        if (x.role !== 'system') {
          return `###### ${x.role}:\n${x.content}\n\n`
        }
      })
      .join('\n') +
    '\n\n\n##### ' +
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
            @click="editMessage(idx)"
            icon="edit"
            dense
            flat
            :class="['edit-button', x.role.toString()]"
            v-if="!editBox.includes(idx)"
            size="sm"
            class="edit-button"
          ></q-btn>
          <vue-markdown :source="x.content" />
        </div>
      </q-chat-message>
      <q-chat-message
        :name="x.role"
        v-if="editBox.includes(idx)"
        :sent="x.role === 'user'"
        size="8"
        class="edit-chat"
        ><div>
          <textarea v-model="x.content as string" rows="10" />
          <q-btn
            @click="saveMessage(idx, x.content as string)"
            icon="save"
            label="Save"
            size="sm"
            color="primary"
          />
        </div>
      </q-chat-message>
    </div>
  </div>
  <div class="bottom-toolbar">
    <div class="signature">
      <div class="inner">
        <q-btn
          @click="openPopup"
          label="Sign and Copy Markdown"
          size="sm"
          color="secondary"
        ></q-btn>
      </div>
    </div>
    <div :class="'prompt ' + isLoading">
      <div class="inner">
        <q-btn @click="pickFiles" flat icon="attach_file" />

        <q-input
          outlined
          v-model="formState.currentQuery"
          placeholder="Message ChatGPT"
          @keyup.enter="sendQuery"
        ></q-input>
        <q-btn color="primary" label="Send" @click="sendQuery" :loading="isLoading" size="sm" />
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
