# Production Deployment Configuration

## Server Requirements

- Node.js v18+ 
- PostgreSQL 12+
- 2GB+ RAM recommended
- SSL certificate for HTTPS

## Environment Variables (Production)

```env
# Server
NODE_ENV=production
PORT=5000

# Database - Use connection pooling URL
DATABASE_URL="postgresql://username:password@db-host:5432/beyondmoksha_blogs?schema=public&connection_limit=20&pool_timeout=30"

# AWS S3
AWS_ACCESS_KEY_ID=<production-key>
AWS_SECRET_ACCESS_KEY=<production-secret>
AWS_REGION=us-east-1
S3_BUCKET=beyondmoksha-blogs-prod
S3_CDN_URL=https://d1234567890.cloudfront.net

# Security
CORS_ORIGIN=https://beyondmoksha.com

# Upload Limits
MAX_FILE_SIZE=10485760
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
ALLOWED_CONTENT_TYPES=text/html,text/markdown

# Redis (Recommended for production)
REDIS_URL=redis://redis-host:6379
REDIS_ENABLED=true
```

## Deployment Steps

### 1. Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/server.js --name beyondmoksha-api

# Configure auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs beyondmoksha-api
pm2 monit

# Stop/Restart
pm2 stop beyondmoksha-api
pm2 restart beyondmoksha-api
```

**PM2 Ecosystem File** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'beyondmoksha-api',
    script: 'src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### 2. Using Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000/health')"

# Start application
CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
      - S3_BUCKET=${S3_BUCKET}
      - REDIS_URL=redis://redis:6379
      - REDIS_ENABLED=true
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=beyondmoksha_blogs
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 3. Using Systemd (Linux)

Create `/etc/systemd/system/beyondmoksha-api.service`:

```ini
[Unit]
Description=BeyondMoksha Blog API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/beyondmoksha-blogs
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=beyondmoksha-api
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Commands:
```bash
sudo systemctl daemon-reload
sudo systemctl enable beyondmoksha-api
sudo systemctl start beyondmoksha-api
sudo systemctl status beyondmoksha-api
```

## Nginx Reverse Proxy

```nginx
upstream beyondmoksha_api {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name api.beyondmoksha.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.beyondmoksha.com;

    ssl_certificate /etc/letsencrypt/live/api.beyondmoksha.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.beyondmoksha.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # File upload size
    client_max_body_size 11M;

    location / {
        proxy_pass http://beyondmoksha_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://beyondmoksha_api;
    }
}
```

## Database Migration in Production

```bash
# Run migrations (non-interactive)
npm run prisma:deploy

# Or using Prisma CLI directly
npx prisma migrate deploy
```

## Monitoring & Logging

### Application Logs
```bash
# Using PM2
pm2 logs

# Using systemd
journalctl -u beyondmoksha-api -f

# Using Docker
docker-compose logs -f api
```

### Performance Monitoring
- Use PM2 monitoring: `pm2 monit`
- Setup New Relic or DataDog
- Configure CloudWatch for AWS resources

### Error Tracking
- Integrate Sentry for error tracking
- Setup log aggregation (ELK stack, CloudWatch Logs)

## Backup Strategy

### Database Backups
```bash
# Automated daily backup
0 2 * * * pg_dump -U postgres beyondmoksha_blogs > /backups/db_$(date +\%Y\%m\%d).sql
```

### S3 Versioning
- Enable versioning on S3 bucket
- Configure lifecycle policies
- Setup cross-region replication

## Security Checklist

- [ ] Use environment variables for secrets
- [ ] Enable HTTPS only
- [ ] Configure rate limiting (use express-rate-limit)
- [ ] Implement authentication/authorization
- [ ] Regular security updates: `npm audit fix`
- [ ] Use security headers (Helmet is configured)
- [ ] Configure CORS properly
- [ ] Enable Redis authentication
- [ ] Use AWS IAM roles instead of access keys (if on EC2)
- [ ] Regular database backups
- [ ] Monitor for suspicious activity

## Performance Optimization

1. **Enable Redis Caching**
   - Cache frequently accessed blogs
   - Cache search results
   - Set appropriate TTL values

2. **Database Optimization**
   - Connection pooling (already configured)
   - Regular VACUUM ANALYZE
   - Monitor slow queries

3. **CDN Configuration**
   - Use CloudFront for S3 content
   - Configure cache headers
   - Enable gzip compression

4. **Load Balancing**
   - Use PM2 cluster mode
   - Or use external load balancer (ALB, nginx)

## Scaling Considerations

### Horizontal Scaling
- Run multiple instances behind load balancer
- Use external Redis for session/cache sharing
- Use RDS PostgreSQL with read replicas

### Vertical Scaling
- Increase server resources (CPU/RAM)
- Optimize database queries
- Implement aggressive caching

## Rollback Strategy

```bash
# Using Git tags
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0

# Rollback to previous version
git checkout v1.0.0
npm install
npm run prisma:generate
pm2 restart beyondmoksha-api
```

## Health Monitoring

Setup monitoring endpoint checks:
- GET /health every 30 seconds
- Alert if response time > 3s
- Alert if status != 200

## Useful Commands

```bash
# Check application status
curl https://api.beyondmoksha.com/health

# Database connection test
psql -h db-host -U username -d beyondmoksha_blogs -c "SELECT COUNT(*) FROM blogs;"

# Redis connection test
redis-cli -h redis-host ping

# S3 access test
aws s3 ls s3://beyondmoksha-blogs-prod/ --region us-east-1

# View active connections
pm2 list
netstat -an | grep :5000

# Memory usage
free -h
pm2 monit
```

## Troubleshooting Production Issues

### High CPU Usage
- Check PM2 logs for errors
- Review slow database queries
- Monitor Redis memory usage

### Database Connection Issues
- Check connection pool settings
- Verify DATABASE_URL
- Review Prisma query logs

### S3 Upload Failures
- Verify IAM permissions
- Check bucket CORS
- Review CloudWatch logs

### Memory Leaks
- Monitor with PM2: `pm2 monit`
- Set `max_memory_restart` in PM2 config
- Profile with Node.js profiling tools

---

For development setup, see SETUP_GUIDE.md
