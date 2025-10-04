# Quick Start Guide

Get your Auditor Edge API running in under 5 minutes!

## Prerequisites

```bash
# Install Node.js 20+ (if not already installed)
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

## Automated Setup (Recommended)

```bash
cd backend
./scripts/setup.sh
```

This script will:
- ✅ Create D1 database
- ✅ Create R2 bucket
- ✅ Create Queue
- ✅ Create Vectorize index
- ✅ Install dependencies
- ✅ Run local migrations
- ✅ Set up .dev.vars

## Manual Setup

If you prefer manual setup:

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Resources
```bash
# D1 database
wrangler d1 create auditor
# Copy the database_id to wrangler.toml

# R2 bucket
wrangler r2 bucket create auditor

# Queue
wrangler queues create auditor-ingest

# Vectorize index
wrangler vectorize create auditor-index --dimensions=768 --metric=cosine
```

### 3. Configure
```bash
# Copy and edit dev vars
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your secrets

# Update wrangler.toml with your database_id and AI Gateway URL
```

### 4. Run Migrations
```bash
npm run migrate:local
```

### 5. Start Dev Server
```bash
npm run dev
```

## Test the API

```bash
# Health check
curl http://localhost:8787

# Create an upload
curl -X POST http://localhost:8787/uploads/create \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "application/pdf",
    "filename": "test.pdf",
    "tenantId": "test-tenant"
  }'
```

## Deploy to Production

```bash
# Set secrets
wrangler secret put TURNSTILE_SECRET
wrangler secret put JWT_SECRET

# Run production migrations
npm run migrate:prod

# Deploy!
npm run deploy
```

## macOS App Integration

### Swift Example

```swift
import Foundation

class AuditorAPI {
    let baseURL = "https://auditor-edge.workers.dev"
    
    // Create upload
    func createUpload(filename: String, contentType: String) async throws -> UploadResponse {
        let url = URL(string: "\(baseURL)/uploads/create")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "filename": filename,
            "contentType": contentType,
            "tenantId": "your-tenant-id"
        ]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(UploadResponse.self, from: data)
    }
    
    // WebSocket connection
    func connectToRun(runId: String) -> URLSessionWebSocketTask {
        let url = URL(string: "wss://auditor-edge.workers.dev/ws/run/\(runId)")!
        return URLSession.shared.webSocketTask(with: url)
    }
}

struct UploadResponse: Codable {
    let runId: String
    let r2PutUrl: String
    let r2Key: String
}
```

## Troubleshooting

### Port already in use
```bash
# Kill process on port 8787
lsof -ti:8787 | xargs kill -9
```

### D1 migrations fail
```bash
# Check database exists
wrangler d1 list

# Run migration manually
wrangler d1 execute auditor --local --file=./migrations/001_init.sql
```

### Can't connect to WebSocket
- Make sure you have a Workers paid plan (required for Durable Objects)
- Check that the DO migration ran successfully

## Next Steps

1. Read the [full README](README.md) for API documentation
2. Explore the [tests](tests/) for usage examples
3. Check out the [route handlers](src/routes/) to understand the implementation
4. Set up CI/CD with GitHub Actions

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Hono Framework](https://hono.dev/)
- [Zod Validation](https://zod.dev/)

Happy coding! 🚀

