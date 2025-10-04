#!/bin/bash

# Auditor Edge API Setup Script

set -e

echo "🚀 Setting up Auditor Edge API..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if logged in
echo "📋 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Please log in to Cloudflare:"
    wrangler login
fi

# Create D1 database
echo "📊 Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create auditor 2>&1 || true)
if echo "$DB_OUTPUT" | grep -q "database_id"; then
    DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk '{print $3}' | tr -d '"')
    echo "✅ D1 database created: $DB_ID"
    echo "⚠️  Please update wrangler.toml with database_id: $DB_ID"
else
    echo "ℹ️  D1 database may already exist"
fi

# Create R2 bucket
echo "🪣 Creating R2 bucket..."
wrangler r2 bucket create auditor 2>&1 || echo "ℹ️  R2 bucket may already exist"

# Create Queue
echo "📬 Creating Queue..."
wrangler queues create auditor-ingest 2>&1 || echo "ℹ️  Queue may already exist"

# Create Vectorize index
echo "🧠 Creating Vectorize index..."
wrangler vectorize create auditor-index --dimensions=768 --metric=cosine 2>&1 || echo "ℹ️  Vectorize index may already exist"

# Copy dev vars
if [ ! -f .dev.vars ]; then
    echo "📝 Creating .dev.vars from example..."
    cp .dev.vars.example .dev.vars
    echo "⚠️  Please edit .dev.vars and add your secrets"
fi

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Run migrations locally
echo "🗄️  Running D1 migrations (local)..."
npm run migrate:local 2>&1 || echo "⚠️  Migration may have failed. Run manually with: npm run migrate:local"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update wrangler.toml with your database_id"
echo "2. Edit .dev.vars with your secrets:"
echo "   - TURNSTILE_SECRET (from Cloudflare dashboard)"
echo "   - JWT_SECRET (generate a random string)"
echo "3. Update AI_GATEWAY_URL in wrangler.toml"
echo "4. Set production secrets:"
echo "   wrangler secret put TURNSTILE_SECRET"
echo "   wrangler secret put JWT_SECRET"
echo "5. Run migrations in production:"
echo "   npm run migrate:prod"
echo "6. Start development server:"
echo "   npm run dev"
echo ""
echo "📚 See README.md for more details"

