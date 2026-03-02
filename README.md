# 📄 Mortgage Ledger System

A scalable document processing system that extracts structured transaction data from Tamil mortgage ledger PDFs using a hybrid **Regex + AI extraction pipeline**.

This system is built with production-grade architecture principles including:

- Asynchronous processing
- Worker-based background jobs
- Caching strategy
- Multi-tenant security
- Confidence scoring
- Manual review workflow

---

# 🚀 Problem Statement

This project implements a full-stack solution to ingest, parse, translate, store, and search 30 years of Tamil real-estate transactions from a PDF into a PostgreSQL database.

The system fulfills the following assignment requirements:

- Accept a Tamil-language PDF containing real-estate transactions.
- Extract structured transaction fields including:
  - Buyer name
  - Seller name
  - Survey number
  - Plot/House number
  - Document number
  - Registration date
  - Transaction value
- Translate Tamil fields into English while preserving accuracy.
- Store extracted records in PostgreSQL.
- Provide searchable API endpoints.
- Display results in a web UI with PDF preview for side-by-side verification.

Key Engineering Goals:

1. Deterministic and reliable data extraction.
2. Accurate Tamil-to-English translation.
3. Scalable architecture for large 30-year PDFs.
4. Safe AI usage without hallucinated financial data.
5. Human-in-the-loop validation via manual override.
---

# 🏗 System Architecture

```
Frontend (Next.js)
        ↓
Backend API (Express + Drizzle)
        ↓
Redis Stream (Job Queue)
        ↓
Worker Service
        ↓
PostgreSQL (Storage)
        ↓
Redis (Caching)
```

---

## 🔹 Why This Architecture?

### 1️⃣ Asynchronous Processing
PDF extraction and AI processing are heavy tasks.  
Upload and processing are decoupled using Redis Streams.

### 2️⃣ Separate Worker Service
Keeps the backend API fast and scalable.

### 3️⃣ Redis Caching
Improves performance for filtered transaction queries.

### 4️⃣ Multi-Tenant Safety
Every document and transaction is user-scoped.

---

# 🛠 Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js 16 + TypeScript + Tailwind |
| Backend | Express + TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle |
| Cache | Redis |
| Object Storage | MinIO (S3 compatible) |
| Worker | Node.js Service |
| Extraction | Regex + Gemini AI |
| Authentication | JWT |

---


---

## 🔹 Components

### 1️⃣ Frontend (Next.js)
- Upload documents
- View extraction progress
- Filter transactions
- Manual override support
- Authentication (JWT)

### 2️⃣ Backend (Express + TypeScript)
- Document upload
- JWT authentication
- Transaction filtering
- Redis Stream publishing
- Cache layer using Redis

### 3️⃣ Worker (Async Processor)
- Consumes Redis Stream
- Downloads PDF from MinIO
- Extracts raw text
- Runs hybrid extraction pipeline
- Stores results in DB
- Updates confidence and status

### 4️⃣ Infrastructure
- PostgreSQL (data storage)
- Redis (queue + caching)
- MinIO (S3-compatible file storage)
- Docker Compose (local infra)

📄 PDF Preview Configuration (MinIO)

For local development, the documents bucket must allow public read access to enable the PDF preview panel.

To make the bucket public:

docker ps

docker exec -it <minio-container-name> sh

mc alias set local http://localhost:9000 minio minio123

mc anonymous set public local/documents


This allows:

Public GET access to objects

Read-only access (no write/delete)

⚠️ In production, this should be replaced with presigned URLs instead of making the bucket public.

---

# 🧠 Extraction Strategy

The system uses a **Hybrid Extraction Model**.

## Step 1 — Segmentation

The PDF is segmented into transaction blocks.

## Step 2 — Regex Extraction

Each block is parsed using rule-based extraction:

- Document number
- Dates
- Survey numbers
- Plot numbers
- Property extent
- Buyer/Seller names (Tamil-aware cleanup)
- Consideration & market values

Regex-first design ensures:

- Deterministic results
- Zero hallucination
- High performance
- No external API dependency

## Step 3 — Optional AI Recovery (Gemini)

If:

- Segmentation confidence is low
- Critical fields fail validation

Then AI fallback may be triggered.

⚠️ AI fallback is optional and may be rate-limited.

The system gracefully handles rate limits and continues with regex-only results.

---

# 🎯 Confidence-Based Workflow

Each document gets a confidence score:

Confidence Score:

```
confidence = extracted_transactions / expected_transactions
```

Rules:

- ≥ 95% → COMPLETED
- < 95% but transactions exist → MANUAL_REQUIRED
- No transactions → FAILED

Manual override is always available for user correction.

This ensures:
- Safety
- Transparency
- User trust
- No silent data corruption
---

# ⚡ Caching Strategy

- Transaction results cached in Redis
- Hash-based cache key for filter combinations
- 6-hour TTL
- SCAN-based invalidation after manual override

This enables fast repeated filtered queries.

---

# 🔐 Security & Multi-Tenancy

- JWT-based authentication
- User-scoped document queries
- Ownership validation in service layer
- Protected frontend routes
- No cross-user data exposure

---

# ⚠️ AI Rate Limit Handling

Gemini API may hit rate limits if using free trial.

System behavior:

- Gracefully provide valid transaction details got from Regex
- Marks document as MANUAL_REQUIRED
- Preserves extracted data
- Avoids system crash
- Ensures no valid data is lost

Design philosophy:
> Never discard valid deterministic extraction due to AI unavailability.

---

# 📁 Monorepo Structure

```
apps/
  backend/
  frontend/
  worker/
packages/
  db/
```

### Benefits:

- Shared schema
- Shared types
- Single dependency management
- Clear service separation
- Easier scalability

---

# 🔐 Environment Configuration

This project uses environment variables.
Each service has its own `.env` file.

## Root `.env`
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mortgage_ai

---

## Backend `.env`
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mortgage_ai
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=your_secret_here
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_BUCKET_NAME=documents

---

## Worker `.env`

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mortgage_ai
REDIS_URL=redis://127.0.0.1:6379
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_BUCKET_NAME=documents
GEMINI_API_KEY=your_api_key_here

---

## Frontend `.env`
NEXT_PUBLIC_API_URL=http://localhost:4000

---

# 🏃 Running the Project

## 1️⃣ Install Dependencies

pnpm install

## 2️⃣ Start Infrastructure

docker-compose up

This starts:

- PostgreSQL
- Redis
- MinIO

## 3️⃣ Configure Environment Files

Copy example files:

cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/frontend/.env.example apps/frontend/.env

Then update secrets if needed.

---

## 4️⃣ Run Backend

pnpm --filter backend dev

## 5️⃣ Run Worker

pnpm --filter worker dev

## 6️⃣ Run Frontend

pnpm --filter frontend dev

Frontend runs at:

http://localhost:3000

---

# 📌 Known Limitations

- Gemini API rate limits may reduce AI fallback usage
- Tamil PDF formatting inconsistencies
- Rare segmentation edge cases
- Some party naming formats require manual review

---

# 🚀 Future Improvements

- WebSocket-based live progress updates
- Improved Tamil NLP model
- AI provider abstraction layer
- Smarter segmentation engine
- Parallel block processing
- Improved buyer/seller extraction heuristics

---

# 🎯 Key Design Decisions

- Regex-first deterministic pipeline
- AI only as recovery layer
- No hallucinated financial data
- Manual override for correctness
- Confidence-driven workflow
- Asynchronous scalable architecture
- Cache-first query optimization

---

# 📎 Conclusion

This system demonstrates:

- Scalable distributed architecture
- Hybrid deterministic + AI extraction
- Safe AI integration
- Production-grade caching strategy
- Multi-tenant secure design
- Human-in-the-loop workflow

The system balances automation with correctness and reliability — ensuring financial data integrity while leveraging AI where beneficial.

---
