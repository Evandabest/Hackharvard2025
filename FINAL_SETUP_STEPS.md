# 🎯 Final Setup Steps - You're Almost Done!

## ✅ What's Already Done

- ✅ Worker deployed: **https://auditor-edge.evanhaque1.workers.dev**
- ✅ D1 database created and migrated (4 tables)
- ✅ R2 bucket created: `auditor`
- ✅ Vectorize index created: `auditor-index`
- ✅ Secrets set (Turnstile, JWT)

## 🔴 What You Need to Complete

### **1. Get Google API Key** (2 minutes)

1. Go to: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Copy the key (starts with `AIzaSy...`)

**Then update `agent/.env` line 2:**
```bash
GOOGLE_API_KEY=AIzaSy...paste-here...
```

---

### **2. Create/Verify AI Gateway** (2 minutes)

1. Go to: https://dash.cloudflare.com/99b429887ccf20faca6cd78dbeb0a207/ai/ai-gateway
2. Check if `auditor-gateway` exists
   - **If YES:** You're good! Skip to Step 3
   - **If NO:** Click "Create Gateway", name it `auditor-gateway`, save

The URL in `wrangler.toml` is already correct ✅

---

### **3. Get R2 API Credentials** (3 minutes)

1. Go to: https://dash.cloudflare.com/99b429887ccf20faca6cd78dbeb0a207/r2/api-tokens
2. Click **"Create API Token"**
3. Settings:
   - Name: `auditor-agent-token`
   - Permissions: **"Object Read & Write"**
   - Apply to buckets: Select `auditor`
4. Click **"Create API Token"**

**You'll see 3 values - copy them ALL:**

```
Access Key ID: abc123xyz789...
Secret Access Key: veryLongSecretKeyHere...
Endpoint for S3 Clients: https://abc123.r2.cloudflarestorage.com
```

**Update `agent/.env` lines 9-11:**
```bash
R2_ENDPOINT=https://abc123.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=abc123xyz789...
R2_SECRET_ACCESS_KEY=veryLongSecretKeyHere...
```

---

### **4. Start the Agent!** (1 minute)

```bash
cd /Users/evandabest/projects/boring.notch/agent

# Install dependencies (if not done)
poetry install

# Start the agent
make dev
```

**You should see:**
```
INFO: Configuration loaded successfully
INFO: Pipeline runner initialized  
INFO: Health server listening on port 8080
INFO: Starting edge job pull loop
```

---

## 🧪 **Test the Complete System**

### **Test 1: Create a Test Job**

```bash
curl -X POST https://auditor-edge.evanhaque1.workers.dev/jobs/enqueue \
  -H "Authorization: Bearer cyZwlCFe8WIwvip6Lf5SMcb1eIYh7nqz9WUryMa5CtM" \
  -H "Content-Type: application/json" \
  -d '{
    "runId": "run_test_001",
    "tenantId": "test_tenant",
    "r2Key": "test/sample.pdf"
  }'
```

**Expected:** `{"success":true,"jobId":"job_...","runId":"run_test_001","status":"pending"}`

### **Test 2: Check Agent Picked It Up**

Watch your agent logs - within 1 second you should see:
```
INFO: Pulled 1 jobs from edge queue
INFO: Processing job job_...
```

It will fail (no actual PDF in R2), but you'll see it working!

---

## 📝 **Your Complete Configuration**

### **Backend** (`backend/wrangler.toml`)
✅ Already configured correctly!

### **Agent** (`agent/.env`)

**Fill in these 3 missing values:**

```bash
# Line 2: Get from Google AI Studio
GOOGLE_API_KEY=AIzaSy...

# Lines 9-11: Get from R2 API Token creation
R2_ENDPOINT=https://...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

**Everything else is already set!**

---

## 🎯 **Summary**

**Your EDGE_BASE_URL is:**
```
https://auditor-edge.evanhaque1.workers.dev
```

**To complete setup, you need:**
1. ✏️ Google API Key → Update `agent/.env` line 2
2. ✏️ R2 credentials → Update `agent/.env` lines 9-11
3. 🚀 Run `make dev` in agent folder

That's it! 🎉

---

## 🆘 **Quick Links**

- **Google API Key**: https://aistudio.google.com/app/apikey
- **AI Gateway**: https://dash.cloudflare.com/99b429887ccf20faca6cd78dbeb0a207/ai/ai-gateway
- **R2 API Tokens**: https://dash.cloudflare.com/99b429887ccf20faca6cd78dbeb0a207/r2/api-tokens

Once you have those 3 things, you're done! 🚀

