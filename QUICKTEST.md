# Quick Test - Verify Your Setup

## 🔧 Last Thing to Fix

Your `agent/.env` has a placeholder in the AI Gateway URL. You need to either:

### **Option 1: Create AI Gateway** (Recommended)

```bash
# Open this URL:
open https://dash.cloudflare.com/99b429887ccf20faca6cd78dbeb0a207/ai/ai-gateway

# If you see "auditor-gateway" - copy its ID
# If not:
#   1. Click "Create Gateway"
#   2. Name: auditor-gateway
#   3. Click Create
#   4. Copy the Gateway ID shown
```

Then update `agent/.env`:
```bash
# Change line 2 from:
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/99b429887ccf20faca6cd78dbeb0a207/GATEWAY_ID/google-ai-studio

# To (replace GATEWAY_ID with actual ID):
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/99b429887ccf20faca6cd78dbeb0a207/auditor-gw-abc123/google-ai-studio
```

### **Option 2: Skip AI Gateway for Now**

For testing, you can bypass the gateway and call Google directly:

```bash
# In agent/.env, change line 2 to:
AI_GATEWAY_URL=https://generativelanguage.googleapis.com/v1beta
```

---

## 🧪 **Test the Agent**

```bash
cd /Users/evandabest/projects/boring.notch/agent

# Install dependencies (if not done)
poetry install

# Test configuration is valid
poetry run python -c "from src.config import get_config; c = get_config(); print('✅ Config loaded!')"

# Start the agent
make dev
```

---

## 🎯 **Create and Process a Test Job**

Once agent is running:

```bash
# In another terminal, create a test job:
curl -X POST https://auditor-edge.evanhaque1.workers.dev/jobs/enqueue \
  -H "Authorization: Bearer cyZwlCFe8WIwvip6Lf5SMcb1eIYh7nqz9WUryMa5CtM" \
  -H "Content-Type: application/json" \
  -d '{
    "runId": "run_test_123",
    "tenantId": "test",
    "r2Key": "test/doc.pdf"
  }'

# Check job was created:
curl -s https://auditor-edge.evanhaque1.workers.dev/jobs/stats \
  -H "Authorization: Bearer cyZwlCFe8WIwvip6Lf5SMcb1eIYh7nqz9WUryMa5CtM"
```

**Agent logs should show:**
```
INFO: Pulled 1 jobs from edge queue
INFO: Processing job job_...
```

It will fail on R2 download (no actual file), but this proves the queue system works! ✅

---

## ✅ **Verification**

Run these 3 commands:

```bash
# 1. Backend health
curl https://auditor-edge.evanhaque1.workers.dev/

# 2. Job stats
curl https://auditor-edge.evanhaque1.workers.dev/jobs/stats \
  -H "Authorization: Bearer cyZwlCFe8WIwvip6Lf5SMcb1eIYh7nqz9WUryMa5CtM"

# 3. Agent health (when running)
curl http://localhost:8080/healthz
```

All should return `200 OK` ✅

---

**Almost there! Just fix the AI_GATEWAY_URL and you're ready to go!** 🚀

