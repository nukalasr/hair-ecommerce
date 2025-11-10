# Docker Deployment Guide

This guide covers Docker containerization for the Hair Bundles Ecommerce application, including local development and production deployment.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Docker Commands Reference](#docker-commands-reference)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Prerequisites

- **Docker**: v24.0 or higher
- **Docker Compose**: v2.20 or higher

### Install Docker

**macOS:**
```bash
brew install --cask docker
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**Windows:**
Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)

### Verify Installation

```bash
docker --version
docker compose version
```

## Quick Start

### Start the Full Stack

```bash
# Start all services (frontend, backend, MongoDB)
docker compose up

# Or run in detached mode (background)
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

Access the application:
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **MongoDB**: localhost:27017
- **Mongo Express** (optional): http://localhost:8081

## Architecture

### Container Overview

```
┌─────────────────────────────────────────────────┐
│                  Docker Host                    │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │   Frontend   │  │   Backend    │           │
│  │   (Nginx)    │  │   (Node.js)  │           │
│  │   Port 4200  │  │   Port 3000  │           │
│  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                    │
│         │                  │                    │
│         │         ┌────────▼─────────┐         │
│         └────────►│    MongoDB       │         │
│                   │    Port 27017    │         │
│                   └──────────────────┘         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Services

1. **Frontend (Nginx + Angular)**
   - Multi-stage build (Node.js build → Nginx serve)
   - Gzip compression enabled
   - Security headers configured
   - Health check endpoint: `/health`

2. **Backend (Node.js + Express)**
   - Production dependencies only
   - Non-root user (nodejs:nodejs)
   - Health check endpoint: `/health`
   - Signal handling with dumb-init

3. **MongoDB**
   - Persistent data volumes
   - Health checks configured
   - Admin credentials (change in production!)

4. **Mongo Express** (Optional Debug Tool)
   - Database admin UI
   - Only runs with `--profile debug`

## Development Setup

### Full Stack Development

```bash
# Start all services with MongoDB admin UI
docker compose --profile debug up

# Rebuild after code changes
docker compose up --build

# Restart specific service
docker compose restart backend

# View service logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Hot Reload for Backend

The `docker-compose.yml` mounts backend source code as a volume:
```yaml
volumes:
  - ./backend:/app
  - /app/node_modules
```

To enable hot reload:
1. Add `nodemon` to backend dependencies
2. Update backend `package.json`:
   ```json
   "scripts": {
     "dev": "nodemon server.js"
   }
   ```
3. Update `docker-compose.yml` backend command:
   ```yaml
   command: npm run dev
   ```

### Database Seeding

```bash
# Execute seed script inside backend container
docker compose exec backend npm run seed

# Or manually connect to MongoDB
docker compose exec mongodb mongosh -u admin -p admin123
```

### Environment Variables

Development environment variables are in `docker-compose.yml`. For production, use `.env` files:

Create `backend/.env.production`:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://admin:password@mongodb:27017/hair-ecommerce?authSource=admin
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
JWT_EXPIRE=7d
STRIPE_SECRET_KEY=sk_live_your_production_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
```

## Production Deployment

### Build Production Images

```bash
# Build frontend
docker build -t hair-ecommerce-frontend:latest .

# Build backend
docker build -t hair-ecommerce-backend:latest ./backend

# Check image sizes
docker images | grep hair-ecommerce
```

### Run Production Containers

#### Using Docker Compose (Production)

Create `docker-compose.prod.yml`:
```yaml
version: '3.9'

services:
  mongodb:
    image: mongo:7.0
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_prod_data:/data/db
    networks:
      - prod-network

  backend:
    image: hair-ecommerce-backend:latest
    restart: always
    env_file:
      - ./backend/.env.production
    depends_on:
      - mongodb
    networks:
      - prod-network

  frontend:
    image: hair-ecommerce-frontend:latest
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - prod-network

networks:
  prod-network:
    driver: bridge

volumes:
  mongodb_prod_data:
```

Start production stack:
```bash
docker compose -f docker-compose.prod.yml up -d
```

#### Using Docker Run (Individual Containers)

```bash
# Create network
docker network create hair-ecommerce-prod

# Run MongoDB
docker run -d \
  --name mongodb \
  --network hair-ecommerce-prod \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=your-secure-password \
  -v mongodb_data:/data/db \
  mongo:7.0

# Run Backend
docker run -d \
  --name backend \
  --network hair-ecommerce-prod \
  -p 3000:3000 \
  --env-file backend/.env.production \
  hair-ecommerce-backend:latest

# Run Frontend
docker run -d \
  --name frontend \
  --network hair-ecommerce-prod \
  -p 80:80 \
  hair-ecommerce-frontend:latest
```

### Deploy to Cloud Platforms

#### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

#### Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Point to your Dockerfile
4. Add environment variables
5. Deploy

#### AWS ECS

```bash
# Push images to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <ecr-url>
docker tag hair-ecommerce-frontend:latest <ecr-url>/frontend:latest
docker push <ecr-url>/frontend:latest

# Create ECS task definition and service via AWS Console or CLI
```

#### Google Cloud Run

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT/frontend
gcloud builds submit --tag gcr.io/YOUR_PROJECT/backend ./backend

# Deploy
gcloud run deploy frontend --image gcr.io/YOUR_PROJECT/frontend --platform managed
gcloud run deploy backend --image gcr.io/YOUR_PROJECT/backend --platform managed
```

## Docker Commands Reference

### Container Management

```bash
# List running containers
docker compose ps

# Stop services
docker compose stop

# Start services
docker compose start

# Restart services
docker compose restart

# Remove containers
docker compose down

# Remove containers and volumes
docker compose down -v
```

### Logs and Debugging

```bash
# View logs
docker compose logs
docker compose logs -f backend
docker compose logs --tail=100 frontend

# Execute commands in container
docker compose exec backend sh
docker compose exec mongodb mongosh

# Inspect container
docker inspect hair-ecommerce-backend

# View resource usage
docker stats
```

### Images

```bash
# List images
docker images

# Remove unused images
docker image prune

# Remove specific image
docker rmi hair-ecommerce-frontend:latest

# Build without cache
docker compose build --no-cache
```

### Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect hair-ecommerce_mongodb_data

# Remove volume
docker volume rm hair-ecommerce_mongodb_data

# Backup volume
docker run --rm -v hair-ecommerce_mongodb_data:/data -v $(pwd):/backup ubuntu tar czf /backup/mongodb-backup.tar.gz /data
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs backend

# Check if port is in use
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Remove and recreate
docker compose down
docker compose up --build
```

### Cannot Connect to MongoDB

```bash
# Check if MongoDB is healthy
docker compose ps

# Test connection
docker compose exec backend node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(err => console.error(err));"

# Check MongoDB logs
docker compose logs mongodb
```

### Frontend 404 Errors

The nginx configuration handles Angular routing. If getting 404s:

1. Check `nginx.conf` has `try_files $uri $uri/ /index.html;`
2. Rebuild frontend: `docker compose up --build frontend`
3. Check nginx logs: `docker compose logs frontend`

### Permission Issues

```bash
# If seeing permission denied errors
docker compose down
docker volume rm hair-ecommerce_mongodb_data
docker compose up
```

### Slow Build Times

```bash
# Use BuildKit (faster builds)
export DOCKER_BUILDKIT=1
docker compose build

# Layer caching - ensure .dockerignore is configured
# Build only changed service
docker compose build backend
```

### Out of Disk Space

```bash
# Clean up unused resources
docker system prune -a

# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## Security Best Practices

### 1. Use Non-Root Users

Both Dockerfiles create non-root users:
- Frontend: `nginx-app` (UID 1001)
- Backend: `nodejs` (UID 1001)

### 2. Multi-Stage Builds

Reduces final image size and attack surface:
- Frontend: 1.2GB builder → 40MB final image
- Backend: 400MB builder → 150MB final image

### 3. Minimize Image Layers

Combine RUN commands and clean up in same layer:
```dockerfile
RUN apk add --no-cache curl && \
    npm install && \
    npm cache clean --force
```

### 4. Security Scanning

```bash
# Scan images for vulnerabilities
docker scan hair-ecommerce-frontend:latest
docker scan hair-ecommerce-backend:latest

# Or use Trivy
trivy image hair-ecommerce-frontend:latest
```

### 5. Secrets Management

Never hardcode secrets in Dockerfiles or docker-compose.yml:

```bash
# Use Docker secrets (Swarm mode)
echo "my-secret" | docker secret create jwt_secret -

# Use environment files
docker compose --env-file .env.production up
```

### 6. Network Isolation

Use custom networks to isolate services:
```yaml
networks:
  frontend-network:
  backend-network:
  database-network:
```

### 7. Read-Only Filesystems

```yaml
services:
  backend:
    read_only: true
    tmpfs:
      - /tmp
      - /app/logs
```

### 8. Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 9. Health Checks

All services have health checks configured:
- Automatic restarts on failure
- Load balancer integration
- Monitoring compatibility

### 10. Regular Updates

```bash
# Update base images regularly
docker compose pull
docker compose up -d

# Check for CVEs
docker scan --accept-license --severity high <image>
```

## Production Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Use environment-specific `.env` files
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up MongoDB authentication
- [ ] Enable MongoDB replica set (for production)
- [ ] Configure backup strategy
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation (ELK, Loki)
- [ ] Implement rate limiting
- [ ] Set resource limits
- [ ] Enable security scanning in CI/CD
- [ ] Configure automatic container restarts
- [ ] Set up health check monitoring
- [ ] Document rollback procedure

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices for Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [Nginx Docker Image](https://hub.docker.com/_/nginx)

## Support

For issues with Docker setup:
1. Check logs: `docker compose logs`
2. Review this documentation
3. Create an issue in the repository
