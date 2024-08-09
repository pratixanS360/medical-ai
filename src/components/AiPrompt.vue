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
  QToggle,
  QBtnGroup,
  QSpace
} from 'quasar'
import { GNAP } from 'vue3-gnap'

const localStorageKey = 'noshuri'
const chatHistory = ref<OpenAI.Chat.ChatCompletionMessageParam[]>([])
const appState = {
  editBox: ref<number[]>([]),
  userName: ref<string>(''),
  message: ref<string>(''),
  messageType: ref<string>(''),
  isLoading: ref<boolean>(false),
  isMessage: ref<boolean>(false),
  isModal: ref<boolean>(false),
  jwt: ref<string>(''),
  isAuthorized: ref<boolean>(false),
  isSaving: ref<boolean>(false),
  timelineAttached: ref<boolean>(false),
  timelineContent: ref<string>(''),
  showTimeline: ref<boolean>(false)
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

const writeMessage = (message: string, messageType: string) => {
  appState.message.value = message
  appState.messageType.value = messageType
  appState.isMessage.value = true
  setTimeout(() => {
    appState.isMessage.value = false
  }, 5000)
}

const urlParams = new URLSearchParams(window.location.search)
let uri = urlParams.get('uri')
if (uri && uri.length > 0) {
  sessionStorage.setItem(localStorageKey, uri)
} else if (sessionStorage.getItem(localStorageKey)) {
  uri = sessionStorage.getItem(localStorageKey) || ''
} else {
  writeMessage('No URI found in Querystring or LocalStorage', 'error')
  uri = ''
}
const access = [
  {
    type: 'App',
    actions: ['read'],
    locations: [uri],
    purpose: 'MAIA - Testing'
  }
]

function showJWT(jwt: string) {
  if (!uri) {
    writeMessage('No URI found in Querystring or LocalStorage', 'error')
    return
  }
  appState.jwt.value = jwt
  writeMessage('Loading Patient Timeline...', 'success')
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
      appState.timelineContent.value = data
      appState.timelineAttached.value = true
      chatHistory.value.push({
        role: 'system',
        content: 'timeline\n\nuploaded at ' + new Date().toLocaleString()
      })
      writeMessage('Patient Timeline Loaded', 'success')
    })
    .catch((error) => {
      console.error(error)
    })
}
function showAuth() {
  appState.isAuthorized.value = true
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
    writeMessage('Failed to parse JSON. Probably a timeout.', 'error')
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
    writeMessage('Saved to Nosh', 'success')
    chatHistory.value = []
    appState.isLoading.value = false
    appState.isModal.value = true
  } catch (error) {
    writeMessage('Failed to parse JSON. Probably a timeout.', 'error')
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

function getSystemMessageType(message: string) {
  const splitpiece = message.split('\n')[0]
  console.log(splitpiece)
  if (splitpiece.includes('timeline')) {
    return 'timeline'
  } else {
    const fileInfo = JSON.parse(splitpiece)
    return `${fileInfo.filename} uploaded.\n\n${fileInfo.size}`
  }
}

async function uploadFile(e: Event) {
  let fileInput = e.target as HTMLInputElement
  if (!fileInput.files || fileInput.files.length === 0) {
    writeMessage('No file selected', 'error')
    return
  }
  const formData = new FormData()
  formData.append('file', fileInput.files[0])
  formData.append('chatHistory', JSON.stringify(chatHistory.value))

  try {
    const response = (await fetch('/.netlify/functions/ai-chat', {
      method: 'POST',
      body: formData
    })) as Response

    if (!response.ok) {
      writeMessage('Failed to upload file', 'error')
      return
    }
    const data = await response.json()
    if (data.chatHistory) {
      writeMessage('File uploaded', 'success')
      chatHistory.value = data.chatHistory
    }
  } catch (error) {
    writeMessage('Failed to upload file', 'error')
  }
}

const signatureContent = () => {
  return `Signed by: ${appState.userName.value} Date: ${new Date().toDateString()}`
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
  <div class="file-upload-area">
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
          ></q-btn>
        </div>
      </q-chat-message>
      <q-chat-message :name="x.role" v-if="x.role === 'system'" size="8" sent>
        <vue-markdown :source="getSystemMessageType(x.content)" class="attachment-message" />
      </q-chat-message>
    </div>
  </div>
  <div class="bottom-toolbar">
    <div class="signature">
      <div class="inner"></div>
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
        <q-btn
          size="sm"
          color="secondary"
          label="Save"
          @click="saveToNosh"
          v-if="appState.isAuthorized.value"
        ></q-btn>
        <GNAP
          helper="blue small"
          @on-authorized="showAuth"
          @jwt="showJWT"
          :access="access"
          server="https://shihjay.xyz/api/as"
        />
      </div>
    </div>
    <div :class="'message ' + appState.messageType.value">
      <p v-if="appState.isMessage.value">
        {{ appState.message.value }}
      </p>
    </div>
  </div>
  <q-dialog v-model="appState.isModal.value">
    <q-card>
      <q-card-section>
        <p>Record Saved to Nosh</p>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn label="Ok" solid @click="appState.isModal.value = false"></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
  <q-dialog v-model="appState.showTimeline.value">
    <q-card>
      <q-card-section class="row">
        <q-space />
        <q-btn icon="close" flat round dense @click="appState.showTimeline.value = false"></q-btn>
      </q-card-section>
      <q-card-section>
        <vue-markdown :source="appState.timelineContent.value" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn label="Close" solid @click="appState.showTimeline.value = false"></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
