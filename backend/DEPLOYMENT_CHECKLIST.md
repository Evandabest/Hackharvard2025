# Deployment Checklist

Use this checklist to ensure proper deployment of the Auditor Edge API.

## Pre-Deployment

### 1. Cloudflare Account Setup
- [ ] Have a Cloudflare account with Workers paid plan
- [ ] Generate API token with Workers permissions
- [ ] Note your Account ID from dashboard

### 2. Install Prerequisites
```bash
# Install Node.js 20+
node --version  # Should be 20.x or higher

# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### 3. Create Cloudflare Resources

#### D1 Database
```bash
wrangler d1 create auditor
# Copy the database_id from output
```

- [ ] D1 database created
- [ ] Update `wrangler.toml` with `database_id`

#### R2 Bucket
```bash
wrangler r2 bucket create auditor
```

- [ ] R2 bucket created
- [ ] Configure CORS if needed (for direct uploads)

#### Queue
```bash
wrangler queues create auditor-ingest
```

- [ ] Queue created

#### Vectorize Index
```bash
wrangler vectorize create auditor-index --dimensions=768 --metric=cosine
```

- [ ] Vectorize index created
- [ ] Note the index configuration

### 4. AI Gateway Setup

- [ ] Create AI Gateway in Cloudflare dashboard
- [ ] Configure Google AI Studio integration
- [ ] Copy Gateway URL
- [ ] Update `AI_GATEWAY_URL` in `wrangler.toml`

### 5. Turnstile Setup

- [ ] Create Turnstile site in Cloudflare dashboard
- [ ] Get site key (for your macOS app)
- [ ] Get secret key (for Workers)

### 6. Configuration

#### Update wrangler.toml
```toml
# Replace these values:
database_id = "your-actual-d1-database-id"

[vars]
AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT/YOUR_GATEWAY/google-ai-studio"
```

- [ ] `database_id` updated
- [ ] `AI_GATEWAY_URL` updated

#### Set Secrets
```bash
# Turnstile secret key
wrangler secret put TURNSTILE_SECRET
# Enter your Turnstile secret when prompted

# JWT secret (generate a strong random string)
wrangler secret put JWT_SECRET
# Enter a strong random string (e.g., openssl rand -base64 32)
```

- [ ] `TURNSTILE_SECRET` set
- [ ] `JWT_SECRET` set

## Deployment Steps

### 1. Install Dependencies
```bash
npm install
```

- [ ] Dependencies installed
- [ ] No vulnerability warnings

### 2. Run Tests
```bash
npm run type-check
npm test
```

- [ ] Type check passes
- [ ] All tests pass

### 3. Run Migrations
```bash
# Production migration
npm run migrate:prod
```

- [ ] Migration executed successfully
- [ ] Tables created (runs, findings, events)

### 4. Deploy
```bash
npm run deploy
```

- [ ] Deployment successful
- [ ] Note the deployed URL

### 5. Verify Deployment

```bash
# Test health endpoint
curl https://your-worker.workers.dev/

# Should return:
# {"service":"auditor-edge","version":"1.0.0","status":"healthy"}
```

- [ ] Health check responds correctly
- [ ] Worker is accessible

## Post-Deployment

### 1. Test All Endpoints

Use the Postman collection (`examples/api-collection.json`):

- [ ] `POST /auth/start` - Authentication works
- [ ] `POST /uploads/create` - R2 signed URLs generated
- [ ] `POST /runs/:runId/enqueue` - Queuing works
- [ ] `GET /runs/:runId/status` - Status retrieval works
- [ ] `GET /ws/run/:runId` - WebSocket connection works
- [ ] `POST /vector/upsert` - Vector upsert works
- [ ] `POST /vector/query` - Vector query works
- [ ] `POST /d1/query` - Database queries work

### 2. Monitor Initial Traffic

Check Cloudflare dashboard:
- [ ] No error spikes
- [ ] Response times are good (<100ms p95)
- [ ] No rate limit issues

### 3. Set Up Monitoring

- [ ] Configure alerts for error rates
- [ ] Set up monitoring for queue depth
- [ ] Monitor D1 query performance
- [ ] Track Durable Object usage

### 4. Documentation

- [ ] Update macOS app with Worker URL
- [ ] Document Turnstile site key for app
- [ ] Save deployment notes

## GitHub Actions Setup (Optional)

### 1. Add Repository Secret

In GitHub repository settings:
- [ ] Add `CLOUDFLARE_API_TOKEN` secret

### 2. Configure Environments

Create environments in GitHub:
- [ ] `staging` environment
- [ ] `production` environment

### 3. Branch Protection

- [ ] Protect `main` branch
- [ ] Require CI checks to pass
- [ ] Require pull request reviews

## Rollback Plan

If issues occur:

```bash
# Rollback to previous version
wrangler rollback

# Check deployment history
wrangler deployments list
```

## Production Checklist

- [ ] All secrets are set
- [ ] All resources are created
- [ ] Migrations are run
- [ ] Tests are passing
- [ ] Deployment is successful
- [ ] Health check works
- [ ] API endpoints respond correctly
- [ ] WebSocket connections work
- [ ] Rate limiting is configured
- [ ] Monitoring is set up
- [ ] Documentation is updated

## Common Issues

### Issue: "Database not found"
**Solution**: Verify database_id in wrangler.toml matches created database

### Issue: "Rate limit errors"
**Solution**: Adjust limits in src/middleware/ratelimit.ts

### Issue: "WebSocket won't connect"
**Solution**: Ensure Workers paid plan is active and DO migration ran

### Issue: "R2 upload fails"
**Solution**: Check R2 bucket CORS configuration

### Issue: "AI Gateway timeout"
**Solution**: Verify AI_GATEWAY_URL is correct and Gateway is configured

## Support

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Wrangler CLI Docs: https://developers.cloudflare.com/workers/wrangler/
- Community Forum: https://community.cloudflare.com/

---

✅ **Ready for Production!**

Once all items are checked, your Auditor Edge API is ready for production use.

