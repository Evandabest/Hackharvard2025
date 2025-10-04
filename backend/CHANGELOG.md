# Changelog

All notable changes to the Auditor Edge API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added
- Initial release of Auditor Edge API
- Authentication with Turnstile and JWT
- R2 signed upload URLs for PDFs and CSVs
- Cloudflare Queues integration for background jobs
- Durable Objects for WebSocket state management
- Real-time WebSocket streaming for run updates
- Vectorize proxy for embeddings and semantic search
- D1 database proxy with whitelisted queries
- AI Gateway integration for LLM and embeddings
- Token bucket rate limiting
- Comprehensive error handling with problem+json
- Input validation with Zod
- Vitest test suite
- GitHub Actions CI/CD pipeline
- Complete documentation and setup scripts

### Security
- Turnstile bot protection
- JWT token authentication
- Time-limited R2 presigned URLs
- Whitelisted D1 query patterns
- Server-only AI Gateway access
- Rate limiting per IP address

## [Unreleased]

### Planned
- Enhanced monitoring and observability
- Additional AI model support
- Batch operations for vectors
- Advanced query filtering
- Webhook notifications
- Multi-tenant isolation improvements

