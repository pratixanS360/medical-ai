import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatMistralAI, MistralAIEmbeddings } from "@langchain/mistralai";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";


const MAX_TOKENS = 4096
const MAX_FILE_SIZE = 2 * 1024 *1024

const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0,  // Adjust the temperature as needed
});


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

const processUserQuery = async (chatHistory, newValue, timeLineData) => {
    
    chatHistory.push({
	role: 'user',
	content: newValue,
    });

    const textSplitter = new RecursiveCharacterTextSplitter({
	chunkSize: 1000,
	chunkOverlap: 200,
    });
    
    const splits = await textSplitter.splitDocuments(timeLineData); // get timeLineData?

    const embeddings = new MistralAIEmbeddings({
	model: "mistral-embed",
    });

    const vectorStore = await MemoryVectorStore.fromDocuments(splits, embeddings);

    const retriever = vectorStore.asRetriever();
    const retrievedDocs = await retriever.invoke(newValue);

    const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");

    //const paddedTimeline = padTokensIfNeeded(chatHistory, retrievedDocs.join('\n'));

    const ragChain = await createStuffDocumentsChain({
	llm,
	prompt,
	outputParser: new StringOutputParser(),
    });

    const response = await ragChain.invoke({
	question: newValue,
	context: retrievedDocs,
    });

    chatHistory.push({
	role: 'system',
	content: response.output,
    });

    return chatHistory;
};

const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
	return { statusCode: 405, body: 'Method Not Allowed' };
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

	    const {chatHistory, newValue} = JSON.parse(event.body);
	    
	    const formData = parseMultipartForm(event)

	    // Check if formData contains file
	    if (!formData || !formData.file) {
		return {
		    statusCode: 400,
		    body: JSON.stringify({ message: 'No file found in form data' })
		}
	    }

	    const updatedChatHistory = await processUserQuery(chatHistory, newValue, formData.file.content);

	    return {
		statusCode: 200,
		body: JSON.stringify(updatedChatHistory)
	    }
	} catch (error) {
	    return {
		statusCode: 500,
		body: JSON.stringify({ message: `Server error: ${error.message}` })
	    }
	}
    } else {
	try {
	    const {chatHistory, newValue} = JSON.parse(event.body);

	    if (!Array.isArray(chatHistory)){
		throw new Error("Invalid chat history format; expected an array.");
	    }

	    // generate chat completion from the LLM
	    const response = await llm.invoke([
		['system',"You are a helpful assistant that responds to user queries related to his medical records. Do not answer if you do not have access to the user's health record or relevant context."],
		['messaages',chatHistory],
		['user', newValue],
	    ]);

	    chatHistory.push({
		role: 'assistant',
		content: response.content
	    });    
	    
	    return {
		statusCode: 200,
		body: JSON.stringify(chatHistory),
	    };
	} catch (error) {
	    return {
		statusCode: 500,
		body: JSON.stringify({ message: `Server error: ${error.message}` }),
	    };
	}
    }
};

export { handler };
