@echo off
echo 🚀 Setting up Auditor Edge API...

echo 📋 Checking for Wrangler CLI...
where wrangler >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Wrangler CLI not found. Please install it with: npm install -g wrangler
    GOTO:EOF
)

echo 📋 Checking Cloudflare authentication...
wrangler whoami

echo 📊 Creating D1 database...
wrangler d1 create auditor

echo 🪣 Creating R2 bucket...
wrangler r2 bucket create auditor

echo 📬 Creating Queue...
wrangler queues create auditor-ingest

echo 🧠 Creating Vectorize index...
wrangler vectorize create auditor-index --dimensions=768 --metric=cosine

if not exist .dev.vars (
    echo 📝 Creating .dev.vars from example...
    copy .dev.vars.example .dev.vars
    echo ⚠️  Please edit .dev.vars and add your secrets
)

echo 📦 Installing npm dependencies...
npm install

echo 🗄️  Running D1 migrations (local)...
npm run migrate:local

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update wrangler.toml with your database_id from the 'wrangler d1 create' output.
echo 2. Edit .dev.vars with your secrets (TURNSTILE_SECRET, JWT_SECRET).
echo 3. Update AI_GATEWAY_URL in wrangler.toml.
echo 4. Set production secrets with 'wrangler secret put'.
echo 5. Run 'npm run dev' to start the server.
