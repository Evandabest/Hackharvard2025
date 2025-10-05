# HaloAudit

HaloAudit is an AI-powered data auditor that lives quietly at the top of your screen. Just drag a file to the halo, and it instantly scans for sensitive data, security risks, and quality issues — right on your device.

Built for developers, analysts, and compliance teams, HaloAudit bridges privacy and convenience by running intelligent audits locally or securely through the cloud. Whether it's CSVs, PDFs, or spreadsheets, HaloAudit identifies PII, secrets, and inconsistencies, then delivers a clear, actionable report in seconds.

**HaloAudit — drop your files, illuminate your data.**

---

## 🚀 Quick Start

### What You Have
A complete, production-ready document audit system with:
- ✅ **Backend API** - Deployed at `https://auditor-edge.evanhaque1.workers.dev`
- ✅ **Python Agent** - Ready to run (dependencies installed)
- ✅ **Swift macOS App** - HaloAudit rebranded and ready

### Test the System (2 minutes)

```bash
# 1. Test backend is working
curl https://auditor-edge.evanhaque1.workers.dev/

# 2. Check job queue  
curl https://auditor-edge.evanhaque1.workers.dev/jobs/stats \
  -H "Authorization: Bearer OnOGTTCQw1Y4+qyah8n0xKDXRe5RLFqu6BM/P+UjR3k"

# 3. Start the agent
cd agent
source venv/bin/activate
python -m src.main

# 4. Test the Swift app
cd ../swift-frontend
./build_and_run.sh
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     macOS App (Swift)                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  AuditorUploadView - Drag & drop PDF/CSV           │    │
│  │  WebSocketManager - Real-time progress             │    │
│  │  AuditorAPIClient - HTTP requests                  │    │
│  └────────────────┬───────────────────────────────────┘    │
└───────────────────┼────────────────────────────────────────┘
                    │ HTTPS/WSS
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         Cloudflare Workers Edge (TypeScript)                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Hono Router + Rate Limiting + Auth                │    │
│  │  • POST /uploads/create    → Signed R2 URLs        │    │
│  │  • POST /runs/:id/enqueue  → D1 job queue          │    │
│  │  • GET  /ws/run/:id        → WebSocket (DO)        │    │
│  │  • POST /jobs/pull|ack     → Job queue API         │    │
│  │  • POST /vector/*          → Vectorize proxy       │    │
│  │  • POST /d1/query          → D1 safe proxy         │    │
│  └────────────────┬───────────────────────────────────┘    │
└───────────────────┼────────────────────────────────────────┘
                    │ Job Queue (D1-backed, free tier)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Python Agent (LangGraph)                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  EdgeJobClient - Poll /jobs/pull every 1s          │    │
│  │  LangGraph Pipeline (9 nodes):                     │    │
│  │    1. Ingest      → Download from R2               │    │
│  │    2. Extract     → Gemini multimodal (no OCR!)    │    │
│  │    3. Chunk       → Split text                     │    │
│  │    4. Embed       → Gemini embeddings              │    │
│  │    5. Index       → Vectorize via edge             │    │
│  │    6. Checks      → 3 deterministic checks         │    │
│  │    7. Analyze     → AI summary                     │    │
│  │    8. Report      → Generate Markdown              │    │
│  │    9. Persist     → Save to D1 via edge            │    │
│  └────────────────┬───────────────────────────────────┘    │
└───────────────────┼────────────────────────────────────────┘
                    │
     ┌──────────────┼──────────────┬─────────────┬──────────┐
     ▼              ▼              ▼             ▼          ▼
┌────────┐    ┌──────────┐   ┌─────────┐  ┌────────┐  ┌─────┐
│   R2   │    │    D1    │   │Vectorize│  │   DO   │  │ AI  │
│Storage │    │Database  │   │ Index   │  │RunRoom │  │ Gwy │
└────────┘    └──────────┘   └─────────┘  └────────┘  └─────┘
```

---

## 📱 Swift App Features

### HaloAudit Branding
- ✅ **App Name**: Changed from "boringNotch" to "HaloAudit"
- ✅ **Bundle ID**: Updated to `com.haloaudit.app`
- ✅ **Display Name**: "HaloAudit" throughout the system
- ✅ **GitHub Link**: Points to `https://github.com/Evandabest/Hackharvard2025`
- ✅ **Logo Assets**: Ready for replacement

### Auditor Tab
- **Location**: Third tab in the notch (Home | Shelf | Auditor)
- **Icon**: Document with magnifying glass
- **Features**:
  - Drag & drop PDF/CSV files
  - Real-time progress updates via WebSocket
  - Professional audit reports with markdown rendering
  - Black theme for report display
  - "Show Report" button redirects to Next.js website

### Upload States
- **Idle**: Dashed border drop zone with "Drag & drop PDF or CSV"
- **Uploading**: Progress bar with percentage
- **Processing**: Circular progress with phase updates
- **Completed**: Green checkmark with "Show Report" button
- **Failed**: Error message with retry option

---

## 🔧 Backend (Cloudflare Workers)

### Deployed Endpoints
**URL**: `https://auditor-edge.evanhaque1.workers.dev`

```typescript
// Client-facing
POST   /uploads/create         // Create upload, get R2 URL
POST   /runs/:id/enqueue        // Queue for processing  
GET    /runs/:id/status         // Get status
GET    /runs/:id/report-url     // Get report URL
GET    /runs/:id/report-content // Serve report content
WS     /ws/run/:id              // Real-time updates

// Server-only (requires Bearer token)
POST   /jobs/enqueue            // Add job to queue
POST   /jobs/pull               // Pull jobs (agent)
POST   /jobs/ack                // Acknowledge jobs
GET    /jobs/stats              // Queue statistics
POST   /vector/upsert           // Index embeddings
POST   /vector/query            // Semantic search
POST   /d1/query                // Safe DB queries
```

### Database Schema
```sql
runs      - Upload and processing runs
findings  - Audit findings from analysis
events    - Log stream for debugging
jobs      - Job queue (replaces Cloudflare Queues)
```

---

## 🐍 Python Agent

### Pipeline (9 nodes)
1. **Ingest** - Download from R2
2. **Extract** - Gemini multimodal API (NO local OCR!)
3. **Chunk** - Smart text splitting  
4. **Embed** - Gemini 768-dim vectors
5. **Index** - Store in Vectorize
6. **Checks** - 3 deterministic checks:
   - Duplicate invoices
   - Round numbers
   - Weekend postings
7. **Analyze** - AI-powered summary
8. **Report** - Markdown generation
9. **Persist** - Save to D1

### Start Agent
```bash
cd agent
source venv/bin/activate
python -m src.main
```

---

## 🌐 Next.js Website

### Report Display
- **URL**: `http://localhost:3000/display?reportUrl=...`
- **Features**:
  - Black theme with professional styling
  - Markdown rendering with syntax highlighting
  - Authentication via `EDGE_API_TOKEN`
  - Responsive design for audit reports

### Setup
```bash
cd landing-page
npm install
npm run dev
```

---

## 🚀 Complete Setup (From Zero)

### 1. Backend Setup
```bash
cd backend

# Create resources
wrangler d1 create auditor
wrangler r2 bucket create auditor
wrangler vectorize create auditor-index --dimensions=768 --metric=cosine

# Set secrets
wrangler secret put TURNSTILE_SECRET
wrangler secret put JWT_SECRET

# Deploy
npm run migrate:prod
npm run deploy
```

### 2. Agent Setup
```bash
cd agent

# Install dependencies
poetry install

# Configure .env (see agent/env.example)
# Start agent
make dev
```

### 3. Swift App
```bash
cd swift-frontend

# Build and run
./build_and_run.sh
```

### 4. Next.js Website
```bash
cd landing-page

# Install dependencies
npm install

# Configure .env.local with EDGE_API_TOKEN
# Start development server
npm run dev
```

---

## 🧪 Testing

### Quick Health Checks
```bash
# Backend health
curl https://auditor-edge.evanhaque1.workers.dev/

# Agent health
curl http://localhost:8080/healthz

# Job queue stats
curl https://auditor-edge.evanhaque1.workers.dev/jobs/stats \
  -H "Authorization: Bearer OnOGTTCQw1Y4+qyah8n0xKDXRe5RLFqu6BM/P+UjR3k"
```

### End-to-End Test
1. Start agent: `cd agent && python -m src.main`
2. Open Swift app: `cd swift-frontend && ./build_and_run.sh`
3. Open notch → Auditor tab → Drop a PDF
4. Watch real-time progress!

---

## 💰 Cost Breakdown

### Free Tier Only!
- **Workers**: First 10M requests free
- **D1**: First 5GB + 5M reads/day free  
- **R2**: First 10GB free
- **Vectorize**: Free tier available
- **Durable Objects**: First 1M requests free

**Estimated monthly cost**: $0 for moderate usage (< 100K documents/month)

---

## 🎯 Key Features

### macOS App
- ✅ Drag & drop file upload
- ✅ Real-time progress visualization
- ✅ WebSocket status updates
- ✅ Professional report display
- ✅ HaloAudit branding throughout

### Backend API
- ✅ Signed R2 upload URLs
- ✅ D1-backed job queue (free!)
- ✅ Durable Objects for WebSocket
- ✅ Vectorize proxy for embeddings
- ✅ Rate limiting and authentication

### AI Pipeline
- ✅ Gemini multimodal text extraction (no OCR!)
- ✅ Gemini embeddings (768-dim)
- ✅ LangGraph orchestration
- ✅ Deterministic audit checks
- ✅ AI-powered analysis
- ✅ Markdown report generation

---

## 🆘 Troubleshooting

### Common Issues
1. **Agent not connecting**: Check `.env` configuration
2. **Swift build fails**: Ensure all files are in Xcode project
3. **WebSocket not working**: Check Durable Object deployment
4. **Report not displaying**: Verify Next.js environment variables

### Debug Commands
```bash
# Check agent logs
cd agent && python -m src.main

# Check backend logs
wrangler tail

# Check Swift app logs
cd swift-frontend && ./build_and_run.sh
```

---

## 📚 Documentation

- **Backend**: `backend/README.md`
- **Agent**: `agent/README.md` 
- **Swift App**: `swift-frontend/boringnotch/components/Auditor/README.md`
- **Architecture**: `backend/ARCHITECTURE.md`
- **Deployment**: `backend/DEPLOYMENT_CHECKLIST.md`

---

## 🎉 What You Built

A **complete, production-ready audit system** with:
- 🌐 Global edge API
- 🤖 AI-powered processing  
- 📱 Beautiful macOS app
- 💰 $0/month cost
- 📚 Comprehensive docs
- ✅ All tests passing

**Total build time**: ~2 hours (with AI assistance!)  
**Total cost**: $0/month  
**Total awesomeness**: 100% 🚀

---

Built with ❤️ using Cloudflare Workers, LangGraph, Gemini AI, and SwiftUI