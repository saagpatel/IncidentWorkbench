.PHONY: install test lint format clean

PYTHON := python3

install:
	cd backend && $(PYTHON) -m pip install -e ".[dev]"

test:
	cd backend && pytest

lint:
	cd backend && ruff check .

format:
	cd backend && ruff format .

clean:
	rm -rf backend/build backend/dist backend/*.egg-info backend/.coverage backend/.pytest_cache
	find . -type d -name __pycache__ -exec rm -rf {} +
