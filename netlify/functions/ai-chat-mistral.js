import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatMistralAI, MistralAIEmbeddings } from "@langchain/mistralai";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";

//const loader = new CheerioWebBaseLoader(
//  "https://lilianweng.github.io/posts/2023-06-23-agent/"
//);

//const docs = await loader.load();

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const splits = await textSplitter.splitDocuments(docs);

const embeddings = new MistralAIEmbeddings({
    model: "mistral-embed",});

const vectorStore = await MemoryVectorStore.fromDocuments(splits, embeddings);

// Retrieve and generate using the relevant snippets of the blog.
const retriever = vectorStore.asRetriever();
const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");

const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0 });

const ragChain = await createStuffDocumentsChain({
  llm,
  prompt,
  outputParser: new StringOutputParser(),
});

// query = 

const retrievedDocs = await retriever.invoke(query);

await ragChain.invoke({
  question: query,
  context: retrievedDocs,
});
