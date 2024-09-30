import { Mistral } from '@mistralai/mistralai';
import { Buffer } from 'buffer';

const apiKey = process.env.MISTRAL_API_KEY
const llm = new Mistral({apiKey: apiKey})

const MAX_TOKENS = 4096
const MAX_FILE_SIZE = 2 * 1024 *1024


// Function to parse multipart form data
const parseMultipartForm = (event) => {
    const boundary = event.headers['content-type'].split('boundary=')[1]
    let result = { file: null, chatHistory: null }
    try {
	const parts = Buffer.from(event.body, 'base64').toString().split(`--${boundary}`)
	
	parts.forEach((part) => {
	    if (part.includes('filename=')) {
		const filenameMatch = part.match(/filename="(.+)"/)
		if (filenameMatch) {
		    const filename = filenameMatch[1]
		    const content = part.split('\r\n\r\n').slice(1).join('\r\n\r\n').trim()

		    // Check file size during parsing
		    const fileSize = Buffer.byteLength(content, 'utf8')
		    if (fileSize > MAX_FILE_SIZE) {
			throw new Error(`File size exceeds the allowed limit of ${MAX_FILE_SIZE} bytes`)
		    }

		    result.file = { filename, content }
		}
	    } else if (part.includes('name="chatHistory"')) {
		const content = part.split('\r\n\r\n')[1].trim()
		result.chatHistory = JSON.parse(content)
	    }
	})
    } catch (error) {
	throw new Error('Error parsing multipart form: ' + error.message)
    }
    return result
}

const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
	return { statusCode: 405, body: 'Method Not Allowed' }
    }

    if (event.headers['content-type'] && event.headers['content-type'].includes('multipart/form-data')) {
	// Check content-length header before parsing
	const fileSize = parseInt(event.headers['content-length'], 10)

	// Check filesize
	if (fileSize > MAX_FILE_SIZE) {
	    return {
		statusCode: 413,
		body: JSON.stringify({ message: 'File size exceeds the allowed limit of 2MB' })
	    }
	}

	try {
	    const formData = parseMultipartForm(event)

	    if (!formData || !formData.file) {
		return {
		    statusCode: 400,
		    body: JSON.stringify({ message: 'No file found in form data' })
		}
	    }

	    const updatedChatHistory = formData.chatHistory || []
	    const newItem = {
		role: 'system',
		content: `{ "type":"file", "filename":"${formData.file.filename}", "size":"${fileSize} bytes"}\n${formData.file.content}`
	    }
	    if (!updatedChatHistory.includes(newItem)) {
		updatedChatHistory.push(newItem)
	    }

	    return {
		statusCode: 200,
		body: JSON.stringify({
		    message: 'Markdown file processed successfully',
		    chatHistory: updatedChatHistory
		})
	    }
	} catch (error) {
	    return {
		statusCode: 500,
		body:JSON.stringify({ message: `Server error: ${error.message}` })
	    }
	}
    } else {
	try {
	    let {chatHistory, newValue} = JSON.parse(event.body)

	    chatHistory.push({
		role: 'user',
		content: newValue
	    })


	    // generate chat completion from the LLM
	    const response = await llm.chat.complete({
		model: 'mistral-large-latest',
		system: "You are a helpful medical assistant that responds to user queries related to their health records. Answer queries related to the user's health record or relevant context. Any response should be in re\
ference to the health record. General information regarding health issues should be provided with caution to contact a real doctor. Do not suggest medications if not mentioned in the health record.",
		messages: chatHistory,
	    })

	    chatHistory.push({
	    		role: 'assistant',
	    		content: response.choices[0].message.content
	    	    })    
	    
	    return {
		statusCode: 200,
		body: JSON.stringify(chatHistory),
	    }
	} catch (error) {
	    return {
		statusCode: 500,
		body: JSON.stringify({ message: `Server error: ${error.message}` }),
	    }
	}
    }
}

export { handler }
