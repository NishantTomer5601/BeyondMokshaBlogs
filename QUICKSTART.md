# 🚀 Quick Start: Using Your API

## For Normal Users (Reading Blogs)

Just use the API - no setup needed!

```bash
# Get all blogs
curl http://localhost:8000/api/blogs

# Get specific blog
curl http://localhost:8000/api/blogs/my-blog-slug

# Get blog with content
curl http://localhost:8000/api/blogs/my-blog-slug/content
```

**Limit:** 100 requests per 15 minutes

---

## For You (Admin - Creating/Editing Blogs)

### Your API Key
```
beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48
```

⚠️ **Keep this secret!** This is like your password.

---

### Using Postman (Easiest Way)

1. **Open Postman**

2. **Create New Request:**
   - Method: `POST`
   - URL: `http://localhost:8000/api/blogs`

3. **Add Header:**
   - Go to "Headers" tab
   - Add: `X-API-Key` = `beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48`

4. **Add Body:**
   - Go to "Body" tab
   - Select "form-data"
   - Add fields:
     - `title` = "My Blog Title"
     - `slug` = "my-blog-title"
     - `summary` = "Blog summary"
     - `tags` = "tech,blog"
     - `authorId` = "nishant"
     - `readTime` = "5"
     - `content` = (file) select HTML file
     - `cover` = (file) select image file

5. **Click Send** ✅

---

### Using cURL (Command Line)

#### Create Blog
```bash
curl -X POST http://localhost:8000/api/blogs \
  -H "X-API-Key: beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48" \
  -F "title=My New Blog" \
  -F "slug=my-new-blog" \
  -F "summary=This is my blog summary" \
  -F "tags=tech,programming" \
  -F "authorId=nishant" \
  -F "readTime=5" \
  -F "content=@path/to/content.html" \
  -F "cover=@path/to/cover.jpg"
```

#### Update Blog
```bash
curl -X PUT http://localhost:8000/api/blogs/1 \
  -H "X-API-Key: beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48" \
  -F "title=Updated Title" \
  -F "summary=Updated summary"
```

#### Delete Blog (Soft Delete)
```bash
curl -X DELETE http://localhost:8000/api/blogs/1 \
  -H "X-API-Key: beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48"
```

#### Delete Blog (Permanent)
```bash
curl -X DELETE http://localhost:8000/api/blogs/1/permanent \
  -H "X-API-Key: beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48"
```

---

### Using JavaScript/Frontend

```javascript
// Store API key in environment variable
const API_KEY = 'beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48';

// Create blog
async function createBlog(formData) {
  const response = await fetch('http://localhost:8000/api/blogs', {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY  // Include API key
    },
    body: formData  // FormData with blog fields
  });
  
  return await response.json();
}

// Update blog
async function updateBlog(blogId, formData) {
  const response = await fetch(`http://localhost:8000/api/blogs/${blogId}`, {
    method: 'PUT',
    headers: {
      'X-API-Key': API_KEY
    },
    body: formData
  });
  
  return await response.json();
}

// Delete blog
async function deleteBlog(blogId) {
  const response = await fetch(`http://localhost:8000/api/blogs/${blogId}`, {
    method: 'DELETE',
    headers: {
      'X-API-Key': API_KEY
    }
  });
  
  return await response.json();
}
```

---

## Rate Limits

| Operation | Limit |
|-----------|-------|
| Reading blogs (anyone) | 100 per 15 minutes |
| Creating/updating (you) | 50 per hour |
| Deleting (you) | 20 per hour |

If you hit the limit, wait for it to reset (shown in response headers).

---

## Common Errors

### "Unauthorized: API key is required"
**Fix:** Add `X-API-Key` header with your API key

### "Forbidden: Invalid API key"
**Fix:** Check API key is correct (copy from `.env` file)

### "Too many requests"
**Fix:** Wait for rate limit to reset (15 minutes for reads, 1 hour for admin operations)

### "Content file is required"
**Fix:** Include HTML content file in your request

---

## Testing

```bash
# Test public read (should work)
curl http://localhost:8000/api/blogs

# Test protected without key (should fail)
curl -X POST http://localhost:8000/api/blogs

# Test protected with key (should work if you provide all required fields)
curl -X POST http://localhost:8000/api/blogs \
  -H "X-API-Key: YOUR_KEY_HERE" \
  -F "title=Test" \
  -F "slug=test" \
  # ... add all required fields
```

---

## Important Files

- **API Key:** `.env` file (never commit to Git!)
- **Logs:** `logs/combined.log` and `logs/error.log`
- **Full Guide:** `AUTHENTICATION_RATE_LIMITING_GUIDE.md`
- **API Documentation:** `BACKEND_API_DOCUMENTATION.md`

---

## Need Help?

1. Check logs: `tail -f logs/combined.log`
2. Read full guide: `AUTHENTICATION_RATE_LIMITING_GUIDE.md`
3. Test in Postman first (easiest way to debug)

---

**Your API Key (save this somewhere safe!):**
```
beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48
```
