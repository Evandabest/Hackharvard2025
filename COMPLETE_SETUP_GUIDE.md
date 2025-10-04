# Complete Setup Guide - From Zero to Running

Your Account ID: **99b429887ccf20faca6cd78dbeb0a207**

Follow this guide **exactly** and you'll have everything running in ~15 minutes.

---

## 🚀 **Part 1: Backend Setup** (10 minutes)

### **Step 1: Create Cloudflare Resources**

```bash
cd /Users/evandabest/projects/boring.notch/backend

# Create D1 database
wrangler d1 create auditor
```

**You'll see output like:**
```
✅ Successfully created DB 'auditor'
database_id = "abc-123-def-456"
```

✏️ **Copy the `database_id`** and update `wrangler.toml` line 15:

```toml
database_id = "abc-123-def-456"  # Paste your actual ID here
```

---

### **Step 2: Create R2 Bucket**

```bash
wrangler r2 bucket create auditor
```

Should say: `✅ Created bucket 'auditor'`

---

### **Step 3: Create Vectorize Index**

```bash
wrangler vectorize create auditor-index --dimensions=768 --metric=cosine
```

Should say: `✅ Successfully created index`

---

### **Step 4: Get Google API Key**

1. Open: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. **Copy the key** (starts with `AIzaSy...`)

✏️ **Save it** - you'll need it soon

---

### **Step 5: Create AI Gateway**

1. Open: https://dash.cloudflare.com/99b429887ccf20faca6cd78dbeb0a207/ai-gateway
2. Click **"Create Gateway"**
3. Name: `auditor-gateway`
4. Click **"Create"**
5. **Copy the Gateway ID** (shown at top of the page)

✏️ **Update `wrangler.toml` line 39:**

```toml
# Replace this line:
AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/99b429887ccf20faca6cd78dbeb0a207/YOUR_GATEWAY_ID/google-ai-studio"
#                                                        ↑ Your account ID      ↑ Paste Gateway ID
```

---

### **Step 6: Create Turnstile Site** (Optional for now)

1. Open: https://dash.cloudflare.com/99b429887ccf20faca6cd78dbeb0a207/turnstile
2. Click **"Add Site"**
3. Settings:
   - Domain: `localhost`
   - Name: `Auditor Test`
4. Click **"Add"**
5. **Copy "Secret Key"** (not site key)

---

### **Step 7: Generate JWT Secret**

```bash
openssl rand -base64 32
```

**Copy the output** (example: `Kx7nP9mQ2vR8wB5tF3jL6hN0sA4yC1zD`)

---

### **Step 8: Set Secrets**

```bash
# Set Turnstile secret (from Step 6)
wrangler secret put TURNSTILE_SECRET
# When prompted, paste the secret from Step 6

# Set JWT secret (from Step 7)
wrangler secret put JWT_SECRET
# When prompted, paste the JWT secret from Step 7
```

---

### **Step 9: Run Migrations**

```bash
npm run migrate:prod
```

Should say: `✅ Successfully executed SQL`

---

### **Step 10: Deploy Worker!**

```bash
npm run deploy
```

**You'll see:**
```
✨ Successfully published auditor-edge
   https://auditor-edge.something-123-xyz.workers.dev
   ↑
   COPY THIS URL - This is your EDGE_BASE_URL!
```

---

### **Step 11: Test Worker**

```bash
# Use the URL from Step 10
curl https://auditor-edge.something-123-xyz.workers.dev/

# Should return:
# {"service":"auditor-edge","version":"1.0.0","status":"healthy"}
```

✅ **Backend is deployed!**

---

## 🐍 **Part 2: Agent Setup** (5 minutes)

### **Step 12: Get R2 Credentials**

1. Open: https://dash.cloudflare.com/99b429887ccf20faca6cd78dbeb0a207/r2/api-tokens
2. Click **"Create API Token"**
3. Settings:
   - Name: `auditor-agent`
   - Type: **"Object Read & Write"**
   - Buckets: Select `auditor`
4. Click **"Create API Token"**

**Copy ALL 3 values:**
```
Access Key ID: abc123xyz...
Secret Access Key: very-long-key...
Endpoint for S3 Clients: https://abc123.r2.cloudflarestorage.com
```

---

### **Step 13: Configure Agent**

```bash
cd /Users/evandabest/projects/boring.notch/agent

# Create .env file
cp env.example .env
```

**Edit `.env` and fill in:**

```bash
# From Step 5 (replace YOUR_GATEWAY_ID with value from Step 5)
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/99b429887ccf20faca6cd78dbeb0a207/YOUR_GATEWAY_ID/google-ai-studio

# From Step 4
GOOGLE_API_KEY=AIzaSy...paste-here...

# From Step 10
EDGE_BASE_URL=https://auditor-edge.something-123-xyz.workers.dev

# From Step 7 (SAME value you used in wrangler secret put)
EDGE_API_TOKEN=Kx7nP9mQ2vR8wB5tF3jL6hN0sA4yC1zD

# From Step 12 (all 3 values)
R2_ENDPOINT=https://abc123.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=abc123xyz...
R2_SECRET_ACCESS_KEY=very-long-key...
R2_BUCKET=auditor

# These are fine as default
GEMINI_CHAT_MODEL=gemini-2.0-flash
GEMINI_EMBED_MODEL=text-embedding-004
BATCH_SIZE=10
VISIBILITY_TIMEOUT=60
LOG_LEVEL=INFO
HEALTH_PORT=8080
```

---

### **Step 14: Install and Test**

```bash
# Install dependencies
poetry install

# Run tests to verify config
poetry run pytest

# Start the agent
make dev
```

**You should see:**
```
INFO: Configuration loaded successfully
INFO: Pipeline runner initialized
INFO: Health server listening on port 8080
INFO: Starting edge job pull loop
INFO: Pulled 0 jobs from edge queue
```

✅ **Agent is running!**

---

## 🧪 **End-to-End Test**

### **Create a Test Job**

```bash
# Use your actual EDGE_BASE_URL and JWT_SECRET
curl -X POST https://auditor-edge.something-123-xyz.workers.dev/jobs/enqueue \
  -H "Authorization: Bearer YOUR_JWT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "runId": "run_test_123",
    "tenantId": "tenant_test",
    "r2Key": "test/sample.pdf"
  }'
```

**The agent should:**
1. Pull the job within 1 second
2. Try to download from R2 (will fail if file doesn't exist - that's OK for testing)
3. Log the processing attempt

---

## 📝 **Quick Reference: What Goes Where**

### **wrangler.toml** (2 edits)
- Line 15: `database_id = "..."`
- Line 39: `AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/99b429887ccf20faca6cd78dbeb0a207/YOUR_GATEWAY_ID/google-ai-studio"`

### **Wrangler Secrets** (2 secrets)
```bash
wrangler secret put TURNSTILE_SECRET
wrangler secret put JWT_SECRET
```

### **Agent .env** (8 required variables)
```bash
AI_GATEWAY_URL=...
GOOGLE_API_KEY=...
EDGE_BASE_URL=...           # From wrangler deploy output
EDGE_API_TOKEN=...          # Same as JWT_SECRET above
R2_ENDPOINT=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=auditor
```

---

## ✅ **Verification Checklist**

```bash
# ✓ Worker deployed
curl YOUR_EDGE_BASE_URL/

# ✓ Jobs API works
curl YOUR_EDGE_BASE_URL/jobs/stats -H "Authorization: Bearer YOUR_JWT_SECRET"

# ✓ Agent running
curl http://localhost:8080/healthz
```

---

## 🆘 **If Something Fails**

**Most common issue:** Missing a step above

**Quick fix:**
1. Re-read the error message
2. Check which variable is missing
3. Go back to that step

**Need help?** Post the error and I'll help debug!

---

**Let's start:** Run the commands from Step 1 and tell me the `database_id` you get! 🚀

