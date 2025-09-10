# Phase 2: Hostinger VPS Migration Plan

> **Status**: Planning phase for production SSL infrastructure
> **Timeline**: After Phase 1 stabilization
> **Goal**: Eliminate DreamHost WebSocket limitations with full SSL support

## Current Phase 1 Limitations

**DreamHost WebSocket Proxy Issue**:
- ❌ `wss://hub.m.agifor.me/bp/connect` (SSL + proxied = fails)
- ⚠️ `ws://hub.m.agifor.me:9025/bp/connect` (works but unencrypted)

Per DreamHost policy: *"WebSockets using a Proxy Server that is available to the public is not supported."*

## Phase 2 Solution: Hostinger VPS + Docker

### Benefits
- ✅ **Native `wss://` support** - Full root access, no proxy limitations
- ✅ **Container isolation** - Each service in dedicated Docker container
- ✅ **Auto-SSL renewal** - Let's Encrypt + certbot automation
- ✅ **Better scaling** - Horizontal scaling with Docker Swarm
- ✅ **Cost effective** - Often cheaper than managed DreamHost hosting

### Target Architecture

```yaml
# docker-compose.yml
version: '3.8'
services:
  braincloud:
    build: ./services/braincloud
    ports:
      - "9025:9025"
    environment:
      - NODE_ENV=production
      - SSL_CERT_PATH=/certs/live/brain.yourdomain.com/fullchain.pem
      - SSL_KEY_PATH=/certs/live/brain.yourdomain.com/privkey.pem
    volumes:
      - ./certs:/certs:ro
    restart: unless-stopped

  nginx-proxy:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/ssl/certs:ro
    depends_on:
      - braincloud

  certbot:
    image: certbot/certbot
    volumes:
      - ./certs:/etc/letsencrypt
    command: certonly --webroot -w /var/www/certbot -d brain.yourdomain.com
```

### Migration Steps

1. **Provision Hostinger VPS**
   - Ubuntu 22.04 LTS
   - Docker + Docker Compose installed
   - Domain pointing to VPS IP

2. **SSL Certificate Setup**
   ```bash
   # Auto-renewing Let's Encrypt certificates
   docker run -it --rm -v ./certs:/etc/letsencrypt \
     certbot/certbot certonly --standalone \
     -d brain.yourdomain.com
   ```

3. **Deploy BrainCloud with SSL**
   ```bash
   # Native WSS support
   wss://brain.yourdomain.com/bp/connect
   ```

4. **Update magi registration**
   ```bash
   # New secure endpoint
   magi register --url wss://brain.yourdomain.com/bp/connect
   ```

### Security Improvements

**Phase 1 → Phase 2**:
- **Transport**: `ws://` → `wss://` (TLS 1.3 encryption)
- **Certificates**: None → Let's Encrypt auto-renewal
- **Infrastructure**: Shared proxy → Dedicated VPS
- **Monitoring**: Basic → Full container monitoring

### ChatGPT Integration Update

**New Configuration**:
- **OpenAPI URL**: `https://brain.yourdomain.com/bp/openapi.json`
- **API Key**: Same composite format `route:secret`
- **WebSocket**: Automatic upgrade to secure `wss://`

### Migration Timeline

- **Week 1**: Hostinger VPS provisioning + Docker setup
- **Week 2**: SSL certificate automation + domain configuration  
- **Week 3**: BrainCloud deployment + testing
- **Week 4**: ChatGPT integration update + user migration

### Rollback Plan

If issues arise, immediate rollback to Phase 1:
```bash
# Quick revert to DreamHost setup
BRAIN_PROXY_URL=ws://hub.m.agifor.me:9025/bp/connect
magi restart
```

---

**This migration eliminates the fundamental WebSocket SSL limitation and provides production-grade infrastructure for Brain Proxy scaling.**

*Next Review: After Phase 1 user feedback and stability assessment*