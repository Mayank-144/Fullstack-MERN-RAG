# 🚀 MERN RAG (Retrieval-Augmented Generation) System

A modern, fullstack AI-powered Knowledge Assistant built with the **MERN Stack**, **Cohere Embed v3**, **MongoDB Atlas Vector Search**, and **Groq Cloud LLM** (`openai/gpt-oss-120b`).

---

## ✨ Features

- 📄 **Multi-Format Ingestion**: Supports PDF (`pdf-parse`) and Excel (`xlsx`) files with automatic routing.
- ✂️ **Smart Chunking**: Sentence-boundary-aware text splitting with sliding window overlap.
- 🧠 **Vector Embeddings**: 1024-dimensional dense vector embeddings generated via **Cohere Embed v3** (`search_document` & `search_query`).
- ⚡ **MongoDB Atlas Vector Search**: Fast similarity search using native `$vectorSearch` cosine aggregation.
- 🤖 **Fast LLM Responses**: High-speed grounded answers powered by **Groq Cloud** with source citations.
- 🔀 **Intelligent Fallback Router**: Document-specific questions trigger RAG with source references; general questions fallback to direct conversational LLM mode.
- 💬 **ChatGPT-style UI**: Minimalist, clean dark interface with Markdown table rendering (`react-markdown` + `remark-gfm`).

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Axios, Lucide Icons, React Markdown, Remark GFM
- **Backend**: Node.js, Express.js (ES Modules)
- **Database**: MongoDB Atlas (Vector Search Index)
- **Embedding Model**: Cohere Embed v3 (`embed-english-v3.0` / 1024 dimensions)
- **LLM Engine**: Groq API (`openai/gpt-oss-120b`)
- **Parsers**: `pdf-parse` (PDF) & `xlsx` (Excel)

---

## 📁 Project Structure

```text
rag-project/
├── server/                         # Express Backend
│   ├── src/
│   │   ├── config/db.js            # MongoDB Atlas connection & DNS resolver
│   │   ├── models/                 # Document & Chunk Mongoose Schemas
│   │   ├── controllers/            # Upload & Chat Controller handlers
│   │   ├── routes/                 # Document & Chat API routes
│   │   ├── services/               # Parsers, Chunking, Cohere & Groq Services
│   │   └── utils/prompts.js        # RAG Grounded Prompts
│   ├── .env.example
│   └── server.js
├── client/                         # React Vite Frontend
│   ├── src/
│   │   ├── components/             # ChatWindow, FileUpload, DocumentList
│   │   ├── services/api.js         # API integration
│   │   └── App.jsx
│   └── vite.config.js
└── README.md
```

---

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone <your-github-repo-url>
cd RAG
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
```
Fill in your credentials in `server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
COHERE_API_KEY=your_cohere_api_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

### 3. Frontend Setup
```bash
cd ../client
npm install
```

---

## 🚀 Running the Application

**Run Backend (Terminal 1):**
```bash
cd server
npm run dev
```

**Run Frontend (Terminal 2):**
```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.
