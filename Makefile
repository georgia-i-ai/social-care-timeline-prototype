# Makefile for the social-care-timeline prototype
# Backend:  FastAPI + SQLite, managed via uv (backend/)
# Frontend: Next.js (TypeScript, App Router, Tailwind) (frontend/)

# Use bash for recipes
SHELL := /bin/bash

BACKEND_DIR  := backend
FRONTEND_DIR := frontend
BACKEND_PORT := 8000
FRONTEND_PORT := 3000

.DEFAULT_GOAL := help

.PHONY: help \
	install install-backend install-frontend \
	dev dev-backend dev-frontend stop \
	build start lint \
	clean clean-backend clean-frontend

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

## --- Install ---------------------------------------------------------------

install: install-backend install-frontend ## Install backend and frontend dependencies

install-backend: ## Sync backend Python dependencies (uv)
	cd $(BACKEND_DIR) && uv sync

install-frontend: ## Install frontend dependencies from package-lock.json
	cd $(FRONTEND_DIR) && npm ci

## --- Develop ---------------------------------------------------------------

dev: ## Run backend and frontend together (Ctrl-C stops both)
	@echo "Starting backend (:$(BACKEND_PORT)) and frontend (:3000)..."
	@trap 'kill 0' EXIT INT TERM; \
	$(MAKE) dev-backend & \
	$(MAKE) dev-frontend & \
	wait

dev-backend: ## Run the backend with autoreload
	cd $(BACKEND_DIR) && uv run uvicorn main:app --reload --port $(BACKEND_PORT)

dev-frontend: ## Run the frontend in development mode
	cd $(FRONTEND_DIR) && npm run dev

stop: ## Kill any running backend/frontend (e.g. left over from a closed terminal)
	@# Servers are found by listening port; uvicorn's reloader parent holds no port, so match it by name too.
	@pids=$$( (lsof -ti tcp:$(BACKEND_PORT) -sTCP:LISTEN; lsof -ti tcp:$(FRONTEND_PORT) -sTCP:LISTEN; pgrep -f "uvicorn main:app") 2>/dev/null | sort -u); \
	if [ -n "$$pids" ]; then echo "Stopping PIDs: $$pids"; kill $$pids 2>/dev/null || true; else echo "Nothing running."; fi

## --- Build / production ----------------------------------------------------

build: ## Create a production build of the frontend
	cd $(FRONTEND_DIR) && npm run build

start: build ## Build and serve the production frontend
	cd $(FRONTEND_DIR) && npm run start

## --- Quality ---------------------------------------------------------------

lint: ## Run frontend ESLint
	cd $(FRONTEND_DIR) && npm run lint

## --- Clean -----------------------------------------------------------------

clean: clean-backend clean-frontend ## Remove build artefacts and installed dependencies

clean-backend: ## Remove the backend virtualenv and caches
	rm -rf $(BACKEND_DIR)/.venv $(BACKEND_DIR)/__pycache__

clean-frontend: ## Remove frontend build output and installed dependencies
	rm -rf $(FRONTEND_DIR)/.next $(FRONTEND_DIR)/node_modules
