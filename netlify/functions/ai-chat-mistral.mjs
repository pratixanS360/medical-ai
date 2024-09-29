import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { ChatMistralAI, MistralAIEmbeddings } from "@langchain/mistralai"
import { pull } from "langchain/hub"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { createStuffDocumentsChain } from "langchain/chains/combine_documents"


const MAX_TOKENS = 4096
const MAX_FILE_SIZE = 2 * 1024 *1024

const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0,  // Adjust the temperature as needed
})


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

const processUserQuery = async (chatHistory, newValue) => {

    try {

    	chatHistory.push({
	    role: 'user',
	    content: newValue
    	})

    	const textSplitter = new RecursiveCharacterTextSplitter({
	    chunkSize: 500,
	    chunkOverlap: 100,
    	})

    	if (!chatHistory || !Array.isArray(chatHistory)) {
     	   throw new Error("chatHistory is undefined or not an array.")
    	}

	const contentArray = chatHistory.map(message => {
	if (!message.content) throw new Error("Message content is missing.")
	return message.content
	})
    	

    	const splits = await textSplitter.createDocuments(contentArray)

	const embeddings = new MistralAIEmbeddings({
	      model: "mistral-embed",
    	})

    	const vectorStore = await MemoryVectorStore.fromDocuments(splits, embeddings)

	const retriever = vectorStore.asRetriever()
    	const retrievedDocs = await retriever.invoke(newValue)

	if (!retrievedDocs) {
      	   throw new Error("retrievedDocs is undefined or null.")
    	}
	
	const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt")

	const ragChain = await createStuffDocumentsChain({
	      llm,
	      prompt,
	      outputParser: new StringOutputParser(),
	})

    	const response = await ragChain.invoke({
	      question: newValue,
	      context: retrievedDocs,
    	})
	
    } catch(error) {
      	return {
	       statusCode: 500,
	       body: JSON.stringify({ message: `Server error processUserQuery: ${error.message}` }),
	}	
    } 
     
    chatHistory.push({
	role: 'assistant',
	content: response.output
    })

    return chatHistory
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
	    const updatedChatHistory = await processUserQuery(chatHistory, newValue)
	    //const response = await llm.invoke([
	    //	('system',"You are a helpful assistant that responds to user queries related to his medical records. Do not answer if you do not have access to the user's health record or relevant context."),
	    //	('human', newValue),
	    // 	 ])

	    //chatHistory.push({
	    //		role: 'assistant',
	    //		content: response.content
	    //	    })    
	    
	    return {
		statusCode: 200,
		body: JSON.stringify(updatedChatHistory),
	    }
	} catch (error) {
	    return {
		statusCode: 500,
		body: JSON.stringify({ message: `Server error 1: ${error.message}` }),
	    }
	}
    }
}

export { handler }
