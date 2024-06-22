/* eslint-disable no-undef */

import OpenAI from 'openai'

const openai = new OpenAI({
  organization: process.env.VITE_ORG_ID,
  project: process.env.VITE_PROJECT_ID,
  apiKey: process.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})
const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let { chatHistory, newValue } = JSON.parse(event.body)
  chatHistory.push({ role: 'user', content: newValue })
  console.log('Added new Value to history')
  const params = {
    messages: chatHistory,
    model: 'gpt-3.5-turbo'
  }

  try {
    console.log('Begin Query')
    const response = await openai.chat.completions.create(params)
    chatHistory.push(response.choices[0].message)
    return {
      statusCode: 200,
      body: JSON.stringify(chatHistory)
    }
  } catch (error) {
    console.log(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    }
  }
}
module.exports = { handler }
