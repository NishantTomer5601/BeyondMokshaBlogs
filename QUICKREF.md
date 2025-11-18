# Quick Reference - BeyondMoksha Blog API

## 🚀 Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your credentials
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## 📋 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-reload |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npm run prisma:deploy` | Deploy migrations (production) |

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/blogs` | List blogs (paginated) |
| GET | `/api/blogs/:slug` | Get blog by slug |
| POST | `/api/blogs` | Create blog |
| PUT | `/api/blogs/:id` | Update blog |
| DELETE | `/api/blogs/:id` | Soft delete blog |
| DELETE | `/api/blogs/:id/permanent` | Permanently delete blog |
| GET | `/api/search?query=text` | Full-text search |

## 🔑 Query Parameters

### GET /api/blogs
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `tags` - Comma-separated tags
- `search` - Search text
- `status` - Filter by status (draft, published, archived)

### GET /api/search
- `query` - Search query (required)
- `page` - Page number (default: 1)
- `limit` - Results limit (default: 20, max: 100)

## 📝 Request Body (POST/PUT)

### Create Blog (POST /api/blogs)
```
Content-Type: multipart/form-data

Fields:
- title (string, required)
- slug (string, required, lowercase-with-hyphens)
- summary (string, optional, max 500 chars)
- tags (JSON array, optional)
- authorId (integer, optional)
- readTime (integer, optional)
- status (string, optional: draft|published|archived)

Files:
- content (file, required: HTML or Markdown)
- cover (file, optional: JPG, PNG, or WebP)
```

### Update Blog (PUT /api/blogs/:id)
```
Content-Type: multipart/form-data

All fields optional
Can include new content and/or cover files to replace existing
```

## 🗄️ Database Schema

```sql
Table: blogs
├── id (serial, primary key)
├── title (text, not null)
├── slug (text, unique, not null)
├── authorId (integer, nullable)
├── summary (text, nullable)
├── tags (text[], nullable)
├── contentUrl (text, not null)
├── coverImageUrl (text, nullable)
├── readTime (integer, nullable)
├── views (integer, default 0)
├── likes (integer, default 0)
├── status (text, default 'draft')
├── createdAt (timestamp, default now())
├── updatedAt (timestamp, auto-update)
└── deletedAt (timestamp, nullable)

Indexes:
- slug (unique)
- status
- deletedAt
- Full-text search GIN index
```

## 📦 Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `S3_BUCKET` - S3 bucket name

### Optional
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development|production)
- `CORS_ORIGIN` - Allowed CORS origin (default: *)
- `S3_CDN_URL` - CloudFront URL
- `REDIS_URL` - Redis connection URL
- `REDIS_ENABLED` - Enable Redis caching (true|false)
- `MAX_FILE_SIZE` - Max upload size in bytes (default: 10485760)
- `ALLOWED_IMAGE_TYPES` - Allowed image MIME types
- `ALLOWED_CONTENT_TYPES` - Allowed content MIME types

## 🛠️ Common Commands

### Development
```bash
# Start dev server
npm run dev

# View database
npm run prisma:studio

# Check logs
tail -f logs/error.log
```

### Database
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Reset database (dev only)
npx prisma migrate reset

# View data
psql -d beyondmoksha_blogs
```

### Testing
```bash
# Health check
curl http://localhost:5000/health

# Create blog
curl -X POST http://localhost:5000/api/blogs \
  -F "title=Test Blog" \
  -F "slug=test-blog" \
  -F "status=published" \
  -F "content=@content.html"

# Get blogs
curl http://localhost:5000/api/blogs?status=published

# Search
curl "http://localhost:5000/api/search?query=test"
```

## 🐛 Debugging

### Check database connection
```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Check S3 access
```bash
aws s3 ls s3://$S3_BUCKET/ --region $AWS_REGION
```

### Check server logs
```bash
# PM2
pm2 logs beyondmoksha-api

# Systemd
journalctl -u beyondmoksha-api -f

# Docker
docker-compose logs -f api
```

### Common Issues
1. **Port in use**: Change PORT in .env
2. **DB connection failed**: Check DATABASE_URL
3. **S3 upload failed**: Verify AWS credentials
4. **Migration error**: Run `npx prisma migrate reset`

## 📊 Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "total": 800,
    "page": 1,
    "limit": 20,
    "totalPages": 40,
    "hasMore": true
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "errors": [...]
}
```

## 🔒 Security Headers (Enabled)

- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Cross-Origin-Resource-Policy: cross-origin
- CORS configured per CORS_ORIGIN

## 📈 Performance Tips

1. **Enable Redis caching** for production
2. **Use CloudFront CDN** for S3 content
3. **Configure connection pooling** (already set)
4. **Run in cluster mode** with PM2
5. **Optimize database queries** with indexes (already set)
6. **Monitor with PM2** or APM tools

## 📚 File Locations

```
Project Root/
├── src/
│   ├── server.js           # Main entry point
│   ├── prismaClient.js     # DB client
│   ├── controllers/        # Business logic
│   ├── routes/            # API routes
│   ├── services/          # S3, external services
│   ├── middleware/        # Validation, etc.
│   ├── utils/             # Helpers
│   └── db/                # Connection pool
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Migration files
├── examples/              # Sample files
├── .env                   # Environment config
└── package.json          # Dependencies
```

## 🎯 Next Steps

1. Configure `.env` with real credentials
2. Run migrations: `npm run prisma:migrate`
3. Start server: `npm run dev`
4. Test with sample data from `examples/`
5. Check DEPLOYMENT.md for production setup

## 💡 Tips

- Use Prisma Studio for quick data inspection
- Tag version releases with git tags
- Enable Redis for 10x performance boost
- Monitor S3 costs with AWS Cost Explorer
- Regular database backups are essential
- Use .env files per environment

---

**Full Documentation:**
- [README.md](README.md) - Complete overview
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment
- [examples/API_EXAMPLES.md](examples/API_EXAMPLES.md) - API usage examples
