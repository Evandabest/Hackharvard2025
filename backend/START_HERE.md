# 🚀 START HERE - Auditor Edge API

Welcome! This is your production-ready Cloudflare Workers edge API for the boring.notch macOS app.

## 📦 What You Got

A complete, production-ready edge API with:

✅ **Authentication** - Turnstile + JWT  
✅ **File Uploads** - R2 signed URLs for PDFs/CSVs  
✅ **Real-time Updates** - WebSocket via Durable Objects  
✅ **Vector Search** - Embeddings & semantic search  
✅ **Database** - D1 with safe query proxy  
✅ **AI Integration** - Gateway to Google AI Studio  
✅ **Background Jobs** - Cloudflare Queues  
✅ **Rate Limiting** - Token bucket algorithm  
✅ **Tests** - Vitest test suite  
✅ **CI/CD** - GitHub Actions workflows  
✅ **Documentation** - Complete guides  

## 🎯 Quick Start (3 Options)

### Option 1: Automated Setup (Easiest)
```bash
cd backend
./scripts/setup.sh
```
Then follow the prompts!

### Option 2: Quick Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Create resources
wrangler d1 create auditor
wrangler r2 bucket create auditor
wrangler queues create auditor-ingest
wrangler vectorize create auditor-index --dimensions=768 --metric=cosine

# 3. Update wrangler.toml with your database_id

# 4. Set secrets
wrangler secret put TURNSTILE_SECRET
wrangler secret put JWT_SECRET

# 5. Run migrations
npm run migrate:prod

# 6. Deploy!
npm run deploy
```

### Option 3: Development Mode First
```bash
# Install and start local dev
npm install
npm run dev

# API available at http://localhost:8787
```

## 📚 Documentation Index

Choose your path:

### For First-Time Setup
1. **[QUICKSTART.md](QUICKSTART.md)** - 5-minute getting started guide
2. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment
3. **[setup.sh](scripts/setup.sh)** - Automated setup script

### For Development
1. **[README.md](README.md)** - Complete API documentation
2. **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Architecture overview
3. **[examples/](examples/)** - Postman collection & WebSocket client

### For Production
1. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Production deployment
2. **[.github/workflows/ci.yml](.github/workflows/ci.yml)** - CI/CD pipeline
3. **[CHANGELOG.md](CHANGELOG.md)** - Version history

## 🏗️ Architecture Overview

```
macOS App (boring.notch)
         │
         ▼
   [Edge Worker]
         │
    ┌────┴────┬────────┬─────────┬──────────┐
    ▼         ▼        ▼         ▼          ▼
   R2      D1 DB   Vectorize  Queues   AI Gateway
 (Files)  (Data)  (Vectors)  (Jobs)    (LLMs)
                                            │
                                            ▼
                                   Google AI Studio
```

## 📊 Project Stats

- **19 TypeScript files** - Well-organized, typed code
- **8 API routes** - Authentication, uploads, runs, vectors, database, AI, WebSocket
- **1 Durable Object** - Real-time state management
- **3 tables** - runs, findings, events
- **14 tests** - Vector and database operations
- **100% ESM** - Modern JavaScript modules
- **Production-ready** - Error handling, validation, rate limiting

## 🔧 Essential Commands

```bash
# Development
npm run dev              # Start local server (port 8787)
npm test                 # Run test suite
npm run type-check       # TypeScript validation

# Database
npm run migrate:local    # Run migrations locally
npm run migrate:prod     # Run migrations in production

# Deployment
npm run deploy           # Deploy to Cloudflare Workers

# Debugging
wrangler tail            # Live logs
wrangler d1 execute auditor --command="SELECT * FROM runs" # Query D1
```

## 🌐 API Endpoints

Once deployed, your API provides:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/auth/start` | POST | Get JWT token |
| `/uploads/create` | POST | Generate R2 upload URL |
| `/runs/:runId/enqueue` | POST | Queue for processing |
| `/runs/:runId/status` | GET | Get run status |
| `/ws/run/:runId` | WS | Real-time updates |
| `/vector/upsert` | POST | Store embeddings |
| `/vector/query` | POST | Semantic search |
| `/d1/query` | POST | Execute safe query |
| `/llm/gateway` | POST | Proxy to AI Gateway |

**Full API docs**: See [README.md](README.md)

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-worker.workers.dev/
```

### 2. Use Postman Collection
1. Import `examples/api-collection.json`
2. Set `baseUrl` variable
3. Test all endpoints

### 3. WebSocket Test Client
Open `examples/websocket-client.html` in browser

## 🔐 Security Checklist

- [ ] Set strong `JWT_SECRET` (32+ random chars)
- [ ] Configure Turnstile on Cloudflare dashboard
- [ ] Set `TURNSTILE_SECRET` in Workers secrets
- [ ] Update `AI_GATEWAY_URL` with your gateway
- [ ] Review rate limits in `src/middleware/ratelimit.ts`
- [ ] Configure R2 bucket CORS if needed
- [ ] Enable Cloudflare WAF rules (recommended)

## 💡 Integration with macOS App

### Swift Example
```swift
// 1. Create upload
let response = try await api.createUpload(
    filename: "audit.pdf",
    contentType: "application/pdf"
)

// 2. Upload file to R2
try await uploadFile(to: response.r2PutUrl, data: fileData)

// 3. Enqueue for processing
try await api.enqueueRun(runId: response.runId, r2Key: response.r2Key)

// 4. Connect WebSocket for updates
let ws = URLSession.shared.webSocketTask(
    with: URL(string: "wss://your-worker.dev/ws/run/\(response.runId)")!
)
ws.resume()
```

**Full example**: See [QUICKSTART.md](QUICKSTART.md#macos-app-integration)

## 🐛 Troubleshooting

### Common Issues

**"Database not found"**
- Update `database_id` in `wrangler.toml`

**"WebSocket won't connect"**
- Ensure Workers paid plan is active
- Verify Durable Objects migration ran

**"Rate limit errors"**
- Adjust limits in `src/middleware/ratelimit.ts`

**More help**: See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md#common-issues)

## 📈 Next Steps

1. ✅ **Deploy** - Get your API live
2. 📱 **Integrate** - Connect your macOS app
3. 🧪 **Test** - Use Postman collection
4. 📊 **Monitor** - Check Cloudflare dashboard
5. 🚀 **Scale** - It's already global!

## 💰 Cost Estimate

For 1M requests/month: **~$5-10**

- Workers: Free (first 10M requests)
- D1: Free (first 25M queries)
- R2: ~$0.15 (10GB storage)
- Durable Objects: ~$0.15
- Queues: Free (first 1M)

## 🆘 Need Help?

- **Documentation**: Start with [QUICKSTART.md](QUICKSTART.md)
- **API Reference**: See [README.md](README.md)
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **GitHub Issues**: [Create an issue](#)

## 📝 What's Inside?

```
backend/
├── 📚 Documentation
│   ├── START_HERE.md (you are here)
│   ├── README.md (complete API docs)
│   ├── QUICKSTART.md (5-min setup)
│   ├── PROJECT_SUMMARY.md (architecture)
│   └── DEPLOYMENT_CHECKLIST.md (production)
│
├── 🎯 Source Code
│   ├── src/
│   │   ├── index.ts (main router)
│   │   ├── routes/ (8 API handlers)
│   │   ├── do/ (Durable Object)
│   │   ├── lib/ (utilities)
│   │   └── middleware/ (rate limiting)
│   │
│   ├── tests/ (Vitest tests)
│   └── migrations/ (D1 schema)
│
├── 🛠️ Configuration
│   ├── wrangler.toml (Cloudflare config)
│   ├── package.json (dependencies)
│   ├── tsconfig.json (TypeScript)
│   └── vitest.config.ts (testing)
│
├── 🚀 Deployment
│   ├── .github/workflows/ci.yml (CI/CD)
│   └── scripts/setup.sh (automation)
│
└── 📦 Examples
    ├── api-collection.json (Postman)
    └── websocket-client.html (WS test)
```

## ✨ Features Highlight

### Rate Limiting
Built-in token bucket rate limiter protects your API.

### Error Handling
RFC 7807 problem+json format for structured errors.

### Input Validation
Zod schemas validate all inputs before processing.

### Real-time Updates
WebSocket streaming via Durable Objects.

### Zero Cold Starts
V8 isolates start in <50ms.

### Global Deployment
Deployed to 300+ Cloudflare locations worldwide.

---

## 🎉 Ready to Deploy?

Choose your path:

**🏃 Quick**: `./scripts/setup.sh && npm run deploy`

**📖 Guided**: Follow [QUICKSTART.md](QUICKSTART.md)

**🔍 Detailed**: Use [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

**Built with ❤️ for boring.notch**

Questions? Check [README.md](README.md) or [QUICKSTART.md](QUICKSTART.md)

