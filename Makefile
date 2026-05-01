WEB_IMAGE := cheflogik-web-img
WEB_CONTAINER := cheflogik-web
API_IMAGE := cheflogik-api-img
API_CONTAINER := cheflogik-api

# ── Frontend  ────────────────────────────────────────────────────
web-build: ## Build frontend docker image
	cd web && docker build -t $(WEB_IMAGE) .

web-run: ## Run frontend container (nginx on port 5500)
	cd web && docker run --name $(WEB_CONTAINER) --env-file ./.env -d -p 5500:5500 $(WEB_IMAGE)

web-stop: ## Stop and remove the frontend container
	docker stop $(WEB_CONTAINER) && docker rm $(WEB_CONTAINER)

web-restart: web-stop web-build web-run ## Stop, rebuild, and restart the frontend container

web-shell: ## Open a bash shell in the app container
	docker exec -it $(WEB_CONTAINER) sh

# ── Backend API  ────────────────────────────────────────────────────
api-build: ## Build frontend docker image
	cd api && docker build -t $(API_IMAGE) .

api-run: ## Build frontend docker image
	cd api && docker run --name $(API_CONTAINER) --network shared_network --env-file ./.env.docker -d -p 8000:8000 $(API_IMAGE)

api-shell: ## Open a bash shell in the app container
	cd api && docker exec -it $(API_CONTAINER) bash