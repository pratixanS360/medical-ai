import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatMistralAI, MistralAIEmbeddings } from "@langchain/mistralai";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";


const processUserQuery = async (chatHistory, newValue, docs) => {
  
  chatHistory.push({
    role: 'user',
    content: newValue,
  });

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const splits = await textSplitter.splitDocuments(docs);

  const embeddings = new MistralAIEmbeddings({
    model: "mistral-embed",
  });

  const vectorStore = await MemoryVectorStore.fromDocuments(splits, embeddings);

  const retriever = vectorStore.asRetriever();
  const retrievedDocs = await retriever.invoke(newValue);

  const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");

  const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0,  // Adjust the temperature as needed
  });

  //const paddedTimeline = padTokensIfNeeded(chatHistory, retrievedDocs.join('\n'));

  const ragChain = await createStuffDocumentsChain({
    llm,
    prompt,
    outputParser: new StringOutputParser(),
  });

  const response = await ragChain.invoke({
    question: newValue,
    context: paddedTimeline,
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

  try {
    const { chatHistory, newValue, docs } = JSON.parse(event.body);

    // Process the user query and timeline data, then generate a response
    const updatedChatHistory = await processUserQuery(chatHistory, newValue, docs);

    return {
      statusCode: 200,
      body: JSON.stringify(updatedChatHistory),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Server error: ${error.message}` }),
    };
  }
};

export { handler };