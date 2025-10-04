# Complete Flow: What Calls What

## 🔄 The Complete Flow

### **Step 1: User Uploads File (Swift App)**

**In `AuditorUploadView.swift` (when user drops/selects file):**

```swift
private func startUpload(fileURL: URL) {
    Task {
        await viewModel.uploadFile(fileURL)  // ← THIS TRIGGERS EVERYTHING
    }
}
```

### **Step 2: Swift → Backend API**

**In `AuditorViewModel.swift`:**

```swift
// 1. Create upload (get signed R2 URL)
let uploadResponse = try await api.createUpload(...)
//     ↓ Calls: POST https://auditor-edge.evanhaque1.workers.dev/uploads/create
//     ↓ Returns: { runId, r2PutUrl, r2Key }

// 2. Upload file directly to R2
try await api.uploadToR2(fileURL, presignedURL, contentType)
//     ↓ Calls: PUT to R2 presigned URL
//     ↓ File now in R2 bucket

// 3. Enqueue for processing
try await api.enqueueRun(runId, r2Key)
//     ↓ Calls: POST /runs/:runId/enqueue
//     ↓ Backend: INSERT INTO jobs (status='pending')
```

### **Step 3: Backend Creates Job**

**In `backend/src/routes/runs.ts`:**

```typescript
// Enqueue job in D1-backed queue
const jobId = generateJobId();
await c.env.DB.prepare(
    `INSERT INTO jobs (id, run_id, tenant_id, r2_key, status, ...)
     VALUES (?, ?, ?, ?, 'pending', ...)`
).bind(jobId, runId, tenantId, r2Key, ...).run();
//     ↓
//     Job now in D1 table with status='pending'
```

### **Step 4: Agent Picks Up Job**

**In `agent/src/main.py` (running in loop):**

```python
# Agent polls every 1 second
jobs = job_client.pull(max=10, visibility_seconds=60)
#     ↓ Calls: POST /jobs/pull
#     ↓ Backend: SELECT FROM jobs WHERE status='pending'
#     ↓ Backend: UPDATE jobs SET status='leased'
#     ↓ Returns: [{ id, runId, tenantId, r2Key }]

# Process each job
for job in jobs:
    success = process_job(runner, job)
    #     ↓ Runs LangGraph pipeline (9 nodes)
    #     ↓ Downloads from R2
    #     ↓ Calls Gemini AI
    #     ↓ Saves to D1
    #     ↓ Emits progress events
    
    # Acknowledge completion
    job_client.ack([job.id], status="done")
    #     ↓ Calls: POST /jobs/ack
    #     ↓ Backend: UPDATE jobs SET status='done'
```

### **Step 5: Real-Time Updates (WebSocket)**

**While agent is processing, in `agent/src/graph/nodes.py`:**

```python
# Each node emits progress
edge_client.emit_event(run_id, "info", "Extracting text...")
#     ↓ Calls: POST /d1/query (insert_event)
#     ↓ Backend: INSERT INTO events
#     ↓ Backend: RunRoom.update({ phase, percent, message })
#     ↓ Durable Object broadcasts to WebSocket clients
```

**Swift app receives updates in `WebSocketManager.swift`:**

```swift
// WebSocket connected to: wss://auditor-edge.../ws/run/:runId
func handleMessage(_ message: URLSessionWebSocketTask.Message) {
    // Receives: { type: "progress", data: { phase, percent, lastMessage } }
    self.currentPhase = progressMsg.data.phase      // ← Updates UI
    self.progress = progressMsg.data.percent        // ← Updates progress bar
    self.lastMessage = progressMsg.data.lastMessage // ← Updates text
}
```

---

## 🎯 The Trigger Button

The **trigger** is when user drops/selects a file in `AuditorUploadView.swift`.

But since those files aren't in Xcode yet, let me create a **standalone test view** you can use right now!

---

## ✅ Quick Test Button

Here's a simple view with just a button to test the complete flow:

