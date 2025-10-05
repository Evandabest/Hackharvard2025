@echo off
GOTO:%1

:help
echo Auditor Agent - Windows Commands
echo.
echo   run.bat install    Install dependencies with Poetry
echo   run.bat dev        Run the agent in development mode
echo   run.bat test       Run test suite with pytest
echo   run.bat fmt        Format code with ruff and black
echo   run.bat lint       Lint code with ruff
GOTO:EOF

:install
echo Installing dependencies...
poetry install
GOTO:EOF

:dev
echo Starting Auditor Agent...
poetry run python -m src.main
GOTO:EOF

:test
echo Running tests...
poetry run pytest
GOTO:EOF

:fmt
echo Formatting code...
poetry run ruff check --fix src/ tests/
poetry run black src/ tests/
GOTO:EOF

:lint
echo Linting code...
poetry run ruff check src/ tests/
poetry run black --check src/ tests/
poetry run mypy src/
GOTO:EOF
