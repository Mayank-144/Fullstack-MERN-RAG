# 🚀 Fullstack MERN RAG (Retrieval-Augmented Generation) System

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB%20Atlas-Vector%20Search-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/products/platform/atlas-vector-search)
[![Cohere](https://img.shields.io/badge/Cohere-Embed%20v3-39594C?style=flat&logo=cohere&logoColor=white)](https://cohere.com/)
[![Groq](https://img.shields.io/badge/Groq-gpt--oss--120b-F55036?style=flat)](https://groq.com/)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat&logo=render&logoColor=white)](https://render.com/)

A production-grade, fullstack **Retrieval-Augmented Generation (RAG)** knowledge assistant. Ingest **PDF** and **Excel** documents, transform text into dense 1024-dimensional embeddings with **Cohere Embed v3**, perform cosine similarity vector search using native **MongoDB Atlas `$vectorSearch`**, and generate grounded, cited answers in milliseconds with **Groq Cloud LLM** (`openai/gpt-oss-120b`).

---

## 📑 Table of Contents

- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [MongoDB Atlas Vector Search Setup](#-mongodb-atlas-vector-search-setup)
- [Getting Started & Local Setup](#-getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
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
        D --> E[Cohere Embed v3 API: 'search_document' input type]
        E --> F[(MongoDB Atlas: Chunks Collection with 1024-dim Vectors)]
    end

    subgraph Retrieval["Query & Generation Pipeline"]
        G[User Asks Question] --> H[Cohere Embed v3 API: 'search_query' input type]
        H --> I[MongoDB Atlas: $vectorSearch Cosine Similarity]
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
- ⚡ **Native MongoDB Atlas Vector Search**:
  - Executes high-performance similarity search directly inside MongoDB using the `$vectorSearch` aggregation stage with Cosine metric.
  - Supports scoped searches targeting a specific document or global search across the entire knowledge base.
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
| **Backend** | Node.js (ES Modules), Express.js 4, Multer (Memory Storage), CORS, Dotenv |
| **Database & Vector Search** | MongoDB Atlas, Mongoose 8, Atlas Vector Search Index (`$vectorSearch`) |
| **Embedding Engine** | Cohere API (`embed-english-v3.0`, 1024 dimensions) |
| **LLM Inference** | Groq Cloud SDK (`openai/gpt-oss-120b`) |
| **File Parsers** | `pdf-parse` (PDF Documents), `xlsx` (Excel Spreadsheets) |
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
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # MongoDB connection with DNS resolution & fast timeout
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
│   │   │   └── vectorSearchService.js # MongoDB Atlas $vectorSearch pipeline
│   │   ├── utils/
│   │   │   └── prompts.js          # System prompts & context formatting
│   │   └── app.js                  # Express application & static client serving
│   ├── .env.example
│   ├── package.json
│   └── server.js                   # Server entry point
├── package.json                    # Root unified build & start script for Render
└── README.md
```

---

## 🔍 MongoDB Atlas Vector Search Setup

To enable vector similarity searches, create a Vector Search Index on your MongoDB Atlas cluster:

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

7. Click **Create Vector Search Index** and wait a few seconds until the status turns **Active**.

---

## ⚙️ Getting Started & Local Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **MongoDB Atlas** database cluster (with vector search enabled)
- **Cohere API Key** ([Get free key at cohere.com](https://dashboard.cohere.com/api-keys))
- **Groq API Key** ([Get free key at console.groq.com](https://console.groq.com/keys))

---

### 1. Clone the Repository

```bash
git clone https://github.com/Mayank-144/Fullstack-MERN-RAG.git
cd Fullstack-MERN-RAG
```

---

### 2. Backend Setup

```bash
cd server
npm install
```

Create `.env` file in the `server` directory:

```bash
cp .env.example .env
```

Configure the environment variables in `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/rag_database?retryWrites=true&w=majority
COHERE_API_KEY=your_cohere_api_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

Start the backend server in development mode:

```bash
npm run dev
```

The backend will start at `http://localhost:5000`.

---

### 3. Frontend Setup

In a new terminal window:

```bash
cd client
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

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
   - **Name**: `rag-assistant` (or any name)
   - **Root Directory**: *(Leave blank)*
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. In **Environment Variables**, add:
   - `MONGODB_URI` = `mongodb+srv://<user>:<password>@cluster0...`
   - `COHERE_API_KEY` = `your_cohere_api_key`
   - `GROQ_API_KEY` = `your_groq_api_key`
   - `GROQ_MODEL` = `openai/gpt-oss-120b`
5. Click **Create Web Service**.

Once deployed, your single live Render URL (e.g. `https://rag-assistant-xxxx.onrender.com`) will serve both the React frontend and the RAG API seamlessly!

---

## ❓ Troubleshooting & FAQs

<details>
<summary><b>1. Error: Atlas Vector Search failed / index not found</b></summary>

Ensure you created the search index on the `chunks` collection with the exact name `vector_index` and `1024` dimensions. Verify that the index status on Atlas is **Active**.
</details>

<details>
<summary><b>2. MongoDB Atlas Connection Timeout or MongooseServerSelectionError</b></summary>

Make sure your current IP address (or `0.0.0.0/0` for cloud deployments) is added to the **Network Access** IP Whitelist in your MongoDB Atlas dashboard.
</details>

<details>
<summary><b>3. Large file upload errors (413 Payload Too Large)</b></summary>

The Express backend is configured with body and file parsing limits (`50mb`). For very large documents (>200 pages), consider splitting into smaller files for optimal chunking and retrieval performance.
</details>

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

Developed with ❤️ using **MERN**, **Cohere Embeddings**, **MongoDB Atlas**, and **Groq LLM**.
