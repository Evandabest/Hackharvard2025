.PHONY: help install dev test fmt lint clean

# Default target
help:
	@echo "Auditor Agent - Makefile Commands"
	@echo ""
	@echo "  make install    Install dependencies with Poetry"
	@echo "  make dev        Run the agent in development mode"
	@echo "  make test       Run test suite with pytest"
	@echo "  make fmt        Format code with ruff and black"
	@echo "  make lint       Lint code with ruff"
	@echo "  make clean      Clean generated files and caches"
	@echo "  make docker     Build Docker image"
	@echo "  make run        Run with docker-compose"
	@echo ""

# Install dependencies
install:
	@echo "Installing dependencies..."
	poetry install

# Run the agent
dev:
	@echo "Starting Auditor Agent..."
	poetry run python -m src.main

# Run tests
test:
	@echo "Running tests..."
	poetry run pytest

# Format code
fmt:
	@echo "Formatting code..."
	poetry run ruff check --fix src/ tests/
	poetry run black src/ tests/

# Lint code
lint:
	@echo "Linting code..."
	poetry run ruff check src/ tests/
	poetry run black --check src/ tests/
	poetry run mypy src/

# Type check
typecheck:
	@echo "Type checking..."
	poetry run mypy src/

# Clean generated files
clean:
	@echo "Cleaning..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -rf dist/ build/ .coverage htmlcov/

# Build Docker image
docker:
	@echo "Building Docker image..."
	docker build -t auditor-agent:latest .

# Run with docker-compose
run:
	@echo "Starting with docker-compose..."
	docker-compose up

# Stop docker-compose
stop:
	docker-compose down

# Show logs
logs:
	docker-compose logs -f agent

