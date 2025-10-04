# Simplified Environment Setup Guide

## 🎯 **The Absolute Minimum You Need**

For the entire system to work, you need **exactly 7 things**:

### ✅ **What You Need**

| # | What | Where Used | Source |
|---|------|-----------|--------|
| 1 | **Turnstile Secret** | Backend | Cloudflare Dashboard → Turnstile |
| 2 | **JWT Secret** | Backend + Agent | Generate yourself |
| 3 | **Google API Key** | Agent | Google AI Studio |
| 4 | **R2 Endpoint** | Agent | Cloudflare Dashboard → R2 |
| 5 | **R2 Access Key** | Agent | R2 API Token creation |
| 6 | **R2 Secret Key** | Agent | R2 API Token creation |
| 7 | **Worker URL** | Agent | After deploying backend |

---

## 📝 **Step-by-Step: Get Everything in 15 Minutes**

### **Step 1: Get Turnstile Secret** (2 minutes)

1. Go to https://dash.cloudflare.com/turnstile
2. Click "Add Site"
3. Fill in:
   - Site name: `Auditor App`
   - Domain: `localhost` (for testing)
4. Click "Add"
5. **Copy the "Secret Key"**

```bash
✅ TURNSTILE_SECRET = 0x4AAAAAAAabc123...
```

---

### **Step 2: Generate JWT Secret** (30 seconds)

Just run this in your terminal:

```bash
openssl rand -base64 32
```

**Copy the output:**
```bash
✅ JWT_SECRET = Kx7nP9mQ2vR8wB5tF3jL6hN0sA4yC1zD
```

**Important:** You'll use this in **2 places**:
- Backend: `wrangler secret put JWT_SECRET`
- Agent: `EDGE_API_TOKEN` in `.env`

---

### **Step 3: Get Google API Key** (2 minutes)

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. **Copy the key**

```bash
✅ GOOGLE_API_KEY = AIzaSyAbc123...
```

---

### **Step 4: Create R2 Bucket and Get Credentials** (5 minutes)

```bash
# Create bucket
wrangler r2 bucket create auditor
```

Then get credentials:

1. Go to https://dash.cloudflare.com → R2
2. Click "Manage R2 API Tokens"
3. Click "Create API Token"
4. Name: `auditor-agent-token`
5. Permissions: **"Object Read & Write"**
6. Click "Create"

**Copy all 3 values shown:**

```bash
✅ R2_ENDPOINT = https://abc123.r2.cloudflarestorage.com
✅ R2_ACCESS_KEY_ID = abc123xyz789
✅ R2_SECRET_ACCESS_KEY = very_long_secret_key_here_123
```

---

### **Step 5: Create Cloudflare Resources** (3 minutes)

```bash
cd backend

# Create D1 database
wrangler d1 create auditor
# ✅ Copy the database_id from output

# Create Vectorize index
wrangler vectorize create auditor-index --dimensions=768 --metric=cosine

# Create AI Gateway
# Go to: https://dash.cloudflare.com → AI Gateway → Create Gateway
# Name: auditor-gateway
# ✅ Copy the Gateway ID
```

---

### **Step 6: Deploy Backend and Get Worker URL** (2 minutes)

```bash
cd backend

# 1. Update wrangler.toml with database_id from Step 5

# 2. Update AI_GATEWAY_URL in wrangler.toml:
# AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/ACCOUNT_ID/GATEWAY_ID/google-ai-studio"

# 3. Set secrets
wrangler secret put TURNSTILE_SECRET
# Paste the value from Step 1

wrangler secret put JWT_SECRET
# Paste the value from Step 2

# 4. Run migrations
npm run migrate:prod

# 5. Deploy
npm run deploy
```

**Copy the deployed URL from the output:**
```bash
✅ EDGE_BASE_URL = https://auditor-edge.YOUR-SUBDOMAIN.workers.dev
```

---

## 🎯 **Final Configuration**

### **Backend: wrangler.toml**

Edit these 2 lines only:

```toml
# Line 15
database_id = "paste-from-step-5"

# Line 39
AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/google-ai-studio"
```

Replace:
- `YOUR_ACCOUNT_ID` - From your Cloudflare dashboard URL
- `YOUR_GATEWAY_ID` - From Step 5

---

### **Agent: .env**

Create `agent/.env` with:

```bash
# From Step 5
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/google-ai-studio

# From Step 3
GOOGLE_API_KEY=AIzaSyAbc123...

# From Step 6
EDGE_BASE_URL=https://auditor-edge.YOUR-SUBDOMAIN.workers.dev

# From Step 2 (same as backend JWT_SECRET)
EDGE_API_TOKEN=Kx7nP9mQ2vR8wB5tF3jL6hN0sA4yC1zD

# From Step 4 (all 3 values)
R2_ENDPOINT=https://abc123.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=abc123xyz789
R2_SECRET_ACCESS_KEY=very_long_secret_key_here_123
R2_BUCKET=auditor

# Defaults (can leave as-is)
GEMINI_CHAT_MODEL=gemini-2.0-flash
GEMINI_EMBED_MODEL=text-embedding-004
BATCH_SIZE=10
VISIBILITY_TIMEOUT=60
LOG_LEVEL=INFO
HEALTH_PORT=8080
```

---

## ✨ **That's It!**

You now have all 7 credentials configured correctly.

### **Start the System**

```bash
# Terminal 1: Run agent
cd agent
make dev

# Terminal 2: Test upload
curl -X POST $EDGE_BASE_URL/uploads/create \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "application/pdf",
    "filename": "test.pdf",
    "tenantId": "test-tenant"
  }'

# Agent will automatically pick up and process the job!
```

---

## 🆘 **Still Confused?**

**The minimal `.env` for agent:**

```bash
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/ACCOUNT/GATEWAY/google-ai-studio
GOOGLE_API_KEY=AIzaSy...
EDGE_BASE_URL=https://your-worker.workers.dev
EDGE_API_TOKEN=your-jwt-secret
R2_ENDPOINT=https://account.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=key123
R2_SECRET_ACCESS_KEY=secret123
R2_BUCKET=auditor
```

**The 2 backend secrets:**
```bash
wrangler secret put TURNSTILE_SECRET
wrangler secret put JWT_SECRET
```

**Done!** 🎉

