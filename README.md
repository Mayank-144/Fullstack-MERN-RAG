# 🚀 Fullstack MERN RAG (Retrieval-Augmented Generation) System

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB%20Atlas-Vector%20Search-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/products/platform/atlas-vector-search)
[![Pinecone](https://img.shields.io/badge/Pinecone-Serverless%20Vector%20DB-000000?style=flat&logo=pinecone&logoColor=white)](https://www.pinecone.io/)
[![Cohere](https://img.shields.io/badge/Cohere-Embed%20v3-39594C?style=flat&logo=cohere&logoColor=white)](https://cohere.com/)
[![Groq](https://img.shields.io/badge/Groq-gpt--oss--120b-F55036?style=flat)](https://groq.com/)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat&logo=render&logoColor=white)](https://render.com/)

A production-grade, fullstack **Retrieval-Augmented Generation (RAG)** knowledge assistant. Ingest **PDF** and **Excel** documents, transform text into dense 1024-dimensional embeddings with **Cohere Embed v3**, perform cosine similarity vector search using either **MongoDB Atlas `$vectorSearch`** or **Pinecone Serverless** (switchable via environment variable), and generate grounded, cited answers in milliseconds with **Groq Cloud LLM** (`openai/gpt-oss-120b`).

---

## 📑 Table of Contents

- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Vector Database Setup](#-vector-database-setup)
  - [Option A: MongoDB Atlas Vector Search (Default)](#option-a-mongodb-atlas-vector-search-default)
  - [Option B: Pinecone Vector Database](#option-b-pinecone-vector-database)
- [Getting Started & Local Setup](#-getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
- [Data Migration (MongoDB to Pinecone)](#-data-migration-mongodb-to-pinecone)
- [API Reference](#-api-reference)
- [Unified Single Deployment on Render](#-unified-single-deployment-on-render-frontend--backend)
  - [Deploy Steps](#deploy-steps)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🏗 System Architecture

```mermaid
flowchart TD
    subgraph Ingestion["Document Ingestion Pipeline"]
        A[User Uploads PDF / Excel] --> B[File Parser: pdf-parse / xlsx]
        B --> C[Text Normalization & Metadata Extraction]
        C --> D[Sliding-Window Semantic Chunking (800 chars / 150 overlap)]
        D --> E[Cohere Embed v3 API: 'search_document' 1024-dim]
        E --> F1[(MongoDB Atlas: Chunks Collection / Metadata)]
        E --> F2[(Pinecone: Serverless Index Vector Storage)]
    end

    subgraph Retrieval["Query & Generation Pipeline"]
        G[User Asks Question] --> H[Cohere Embed v3 API: 'search_query' 1024-dim]
        H --> I[Vector Store Router: Atlas $vectorSearch OR Pinecone]
        I --> J{Similarity Score >= 0.65?}
        J -- Yes (Document Match) --> K[Assemble Grounded Context Prompt + Citations]
        J -- No (Low Similarity / General) --> L[Fallback: Direct Conversational LLM Mode]
        K --> M[Groq Cloud LLM: openai/gpt-oss-120b]
        L --> M
        M --> N[ChatGPT-Style UI with Markdown & Source Drawer]
    end
```

---

## ✨ Key Features

- 📄 **Multi-Format Ingestion Engine**:
  - Direct parsing for **PDF** documents (`pdf-parse`) with metadata and page layout awareness.
  - Multi-sheet **Excel** spreadsheets (`xlsx`) converted to structured tabular text representation.
- ✂️ **Smart Semantic Chunking**:
  - Overlapping sliding-window chunking (800 character window with 150 character overlap) preserving sentence boundaries and context continuity.
  - Automatic token estimation and character metrics stored per chunk.
- 🧠 **1024-Dimensional Dense Embeddings**:
  - Powered by **Cohere Embed v3** (`embed-english-v3.0`).
  - Strict differentiation between document indexing (`search_document`) and user search queries (`search_query`) for enhanced retrieval accuracy.
- ⚡ **Dual Swappable Vector Database Support**:
  - **MongoDB Atlas Vector Search**: Executes high-performance similarity search directly inside MongoDB using native `$vectorSearch` aggregation stage.
  - **Pinecone Serverless**: High-scale dedicated vector store with normalized cosine score matching and deterministic ID mapping.
  - Seamlessly switch between databases using `VECTOR_DB=mongo` or `VECTOR_DB=pinecone`.
- 🔀 **Intelligent Dual-Mode Fallback Router**:
  - Evaluates retrieved chunk similarity against a confidence threshold (`0.65`).
  - **RAG Mode**: Generates factual, hallucination-resistant answers with chunk-level citations.
  - **Direct LLM Fallback**: General greetings, questions, or coding problems are answered conversationally without grounding errors.
- 💬 **ChatGPT-Inspired UI**:
  - Dark-mode aesthetic with collapsible sidebar and document manager.
  - Real-time file upload progress bar and active document focus indicator.
  - Rich Markdown rendering with full GitHub Flavored Markdown table and code support (`react-markdown` + `remark-gfm`).
  - Interactive citations drawer displaying referenced chunks and similarity metrics.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, Axios, Lucide Icons, React Markdown, Remark GFM, CSS Tokens |
| **Backend** | Node.js (ES Modules, Plain JS), Express.js 4, Multer (Memory Storage), CORS, Dotenv |
| **Databases** | MongoDB Atlas (Document & Chunk Metadata), Mongoose 8 |
| **Vector Search Providers** | MongoDB Atlas `$vectorSearch` (Default) **OR** Pinecone Serverless (`@pinecone-database/pinecone`) |
| **Embedding Engine** | Cohere API (`embed-english-v3.0`, 1024 dimensions) |
| **LLM Inference** | Groq Cloud SDK (`openai/gpt-oss-120b`) |
| **File Parsers** | `pdf-parse` (PDF Documents), `xlsx` (Excel Spreadsheets) |
| **Testing** | Node.js built-in `node:test` runner |
| **Hosting & Deployment** | Render (Backend Web Service & Frontend Static Site) |

---

## 📁 Project Structure

```text
Fullstack-MERN-RAG/
├── client/                         # React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx      # ChatGPT-style conversation view & citations
│   │   │   ├── FileUpload.jsx      # Drag & Drop upload modal component
│   │   │   └── DocumentList.jsx    # Knowledge base document list
│   │   ├── services/
│   │   │   └── api.js              # Axios API client & endpoints
│   │   ├── App.jsx                 # Main layout & state orchestration
│   │   ├── index.css               # Global dark-theme tokens & typography
│   │   └── main.jsx                # React DOM entry point
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js              # Vite config with backend proxy
├── server/                         # Express.js Backend
│   ├── scripts/
│   │   ├── setupPineconeIndex.js   # Automated Pinecone index initialization
│   │   └── migrateMongoToPinecone.js # Zero-loss MongoDB -> Pinecone vector migrator
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js               # MongoDB connection with DNS resolution
│   │   │   └── pinecone.js         # Lazy singleton Pinecone client & configuration
│   │   ├── controllers/
│   │   │   ├── chatController.js   # RAG & direct chat query handlers
│   │   │   └── documentController.js # Upload, chunk, embed, delete handlers
│   │   ├── middlewares/
│   │   │   └── upload.js           # Multer configuration (PDF/Excel validator)
│   │   ├── models/
│   │   │   ├── Chunk.js            # Vector chunk schema & indexes
│   │   │   └── Document.js         # Document metadata schema
│   │   ├── routes/
│   │   │   ├── chatRoutes.js       # /api/chat endpoints
│   │   │   └── documentRoutes.js   # /api/documents endpoints
│   │   ├── services/
│   │   │   ├── chunkService.js     # Text splitting & window overlap logic
│   │   │   ├── cohereService.js    # Cohere Embed v3 integration
│   │   │   ├── groqService.js      # Groq LLM completions & RAG prompt builder
│   │   │   ├── parserService.js    # PDF & Excel extraction
│   │   │   ├── pineconeService.js  # Pinecone upsert, query, delete, and score normalization
│   │   │   └── vectorSearchService.js # Swappable vector search router
│   │   ├── utils/
│   │   │   └── prompts.js          # System prompts & context formatting
│   │   └── app.js                  # Express application & static client serving
│   ├── tests/
│   │   ├── configAndDispatch.test.js     # Config & provider dispatch unit tests
│   │   ├── pineconeService.unit.test.js  # Score normalization & batching unit tests
│   │   └── pineconeSdk.mockServer.test.js# Real Pinecone SDK HTTP mock integration tests
│   ├── .env.example
│   ├── package.json
│   └── server.js                   # Server entry point
├── package.json                    # Root unified build & start script for Render
└── README.md
```

---

## 🔍 Vector Database Setup

### Option A: MongoDB Atlas Vector Search (Default)

To use MongoDB Atlas native Vector Search (`VECTOR_DB=mongo`):

1. Open **[MongoDB Atlas](https://cloud.mongodb.com/)** and navigate to your database cluster.
2. Go to **Atlas Search** > **Vector Search Indexes** > click **Create Vector Search Index**.
3. Choose **JSON Editor**.
4. Select your database name (e.g., `rag_database`) and collection: **`chunks`**.
5. Set Index Name to: `vector_index`.
6. Paste the following JSON configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "documentId"
    }
  ]
}
```

7. Click **Create Vector Search Index** and wait until the status turns **Active**.

---

### Option B: Pinecone Vector Database

To use Pinecone Serverless as your vector store (`VECTOR_DB=pinecone`):

1. Create a free account at **[Pinecone.io](https://www.pinecone.io/)** and generate an API key.
2. In `server/.env`, set:
   ```env
   VECTOR_DB=pinecone
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=rag-index
   ```
3. Run the automated index setup script from the `server` directory:
   ```bash
   npm run pinecone:setup
   ```
   *(This creates a 1024-dimension Serverless index with cosine metric on AWS `us-east-1` automatically).*

---

## ⚙️ Getting Started & Local Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **MongoDB Atlas** database cluster (always required for document metadata and chat context)
- **Cohere API Key** ([Get free key at cohere.com](https://dashboard.cohere.com/api-keys))
- **Groq API Key** ([Get free key at console.groq.com](https://console.groq.com/keys))
- *(Optional)* **Pinecone API Key** ([Get key at pinecone.io](https://app.pinecone.io/))

---

### 1. Backend Setup

```bash
cd server
npm install
```

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure `server/.env`:

```env
PORT=5000
VECTOR_DB=mongo # or 'pinecone'
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/rag_database?retryWrites=true&w=majority
COHERE_API_KEY=your_cohere_api_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b

# If using Pinecone:
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=rag-index
```

Start the backend server in development mode:

```bash
npm run dev
```

Run tests to verify configuration and vector operations:

```bash
npm test
```

---

### 2. Frontend Setup

In a new terminal window:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔄 Data Migration (MongoDB to Pinecone)

If you have already uploaded documents while running in MongoDB Atlas mode and want to switch to Pinecone, run the zero-loss migration script:

1. **Dry-Run (Count chunks without writing to Pinecone)**:
   ```bash
   node scripts/migrateMongoToPinecone.js --dry-run
   ```
2. **Execute Migration**:
   ```bash
   npm run pinecone:migrate
   ```

*Note: This streams chunks with embeddings from MongoDB and upserts them to Pinecone in batches of 100 with deterministic IDs (`<documentId>_<chunkIndex>`). MongoDB records remain untouched.*

---

## 📡 API Reference

### Document Management

| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/documents/upload` | Upload & ingest PDF or Excel document | `multipart/form-data` with `file` |
| `GET` | `/api/documents` | List all tracked documents & metadata | None |
| `DELETE` | `/api/documents/:id` | Cascade delete document and its vector chunks | URL parameter `id` |

---

### Chat & Vector Retrieval

| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chat/message` | Full RAG / Fallback conversational query | `{ query, documentId?, history? }` |
| `POST` | `/api/chat/retrieve` | Inspect raw retrieved vector chunks | `{ query, documentId?, limit? }` |
| `GET` | `/health` | Server health and uptime status | None |

---

## 🌐 Unified Single Deployment on Render (Frontend + Backend)

You can deploy the entire fullstack application (React frontend + Node.js backend) together in **1 Single Web Service** on Render:

### Deploy Steps:

1. Go to **[Render Dashboard](https://dashboard.render.com/)** and click **New +** > **Web Service**.
2. Connect your GitHub repository `Fullstack-MERN-RAG`.
3. Configure the service settings:
   - **Name**: `rag-assistant`
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. In **Environment Variables**, add:
   - `VECTOR_DB` = `mongo` *(or `pinecone`)*
   - `MONGODB_URI` = `mongodb+srv://<user>:<password>@cluster0...`
   - `COHERE_API_KEY` = `your_cohere_api_key`
   - `GROQ_API_KEY` = `your_groq_api_key`
   - `GROQ_MODEL` = `openai/gpt-oss-120b`
   - *(If Pinecone enabled)* `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`
5. Click **Create Web Service**.

---

## ❓ Troubleshooting & FAQs

<details>
<summary><b>1. Error: Configuration Mismatch on Pinecone Index</b></summary>

Cohere Embed v3 produces 1024-dimensional vectors and uses cosine similarity. If your existing Pinecone index was created with a different dimension (e.g. 1536) or metric, `npm run pinecone:setup` will report a mismatch. Delete the old index or set a different `PINECONE_INDEX_NAME` in `server/.env`.
</details>

<details>
<summary><b>2. Documents uploaded in Mongo mode not found after switching to Pinecone</b></summary>

When switching `VECTOR_DB` to `pinecone`, documents uploaded prior to the switch only have vector embeddings in MongoDB. Run `npm run pinecone:migrate` to copy all vector embeddings into Pinecone.
</details>

<details>
<summary><b>3. Error: Atlas Vector Search failed / index not found</b></summary>

Ensure you created the search index on the `chunks` collection with the exact name `vector_index` and `1024` dimensions. Verify that the index status on Atlas is **Active**.
</details>

<details>
<summary><b>4. MongoDB Atlas Connection Timeout or MongooseServerSelectionError</b></summary>

Make sure your current IP address (or `0.0.0.0/0` for cloud deployments) is added to the **Network Access** IP Whitelist in your MongoDB Atlas dashboard.
</details>

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
