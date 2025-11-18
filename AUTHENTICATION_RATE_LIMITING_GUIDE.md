# 🔐 Authentication & Rate Limiting Guide

**BeyondMoksha Blog API - Complete Implementation Guide**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication System](#authentication-system)
3. [Rate Limiting System](#rate-limiting-system)
4. [How Users Interact](#how-users-interact)
5. [Testing Examples](#testing-examples)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Your BeyondMoksha Blog API now has two security layers:

### 1. **API Key Authentication**
- Protects create/update/delete operations
- Simple and secure
- No user database needed
- Perfect for single admin (you)

### 2. **Rate Limiting**
- Prevents API abuse and DDoS attacks
- Different limits for different operations
- Tracks by IP address
- Returns helpful headers

---

## 🔐 Authentication System

### How It Works

```
┌─────────────────────────────────────────────────────┐
│  PUBLIC ENDPOINTS (No Authentication)               │
├─────────────────────────────────────────────────────┤
│  ✅ GET  /api/blogs                                 │
│  ✅ GET  /api/blogs/:slug                           │
│  ✅ GET  /api/blogs/:slug/content                   │
│  ✅ GET  /health                                    │
│                                                      │
│  Anyone can access these endpoints                  │
│  No API key required                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  PROTECTED ENDPOINTS (API Key Required)             │
├─────────────────────────────────────────────────────┤
│  🔒 POST   /api/blogs           Create blog         │
│  🔒 PUT    /api/blogs/:id       Update blog         │
│  🔒 DELETE /api/blogs/:id       Delete blog         │
│  🔒 DELETE /api/blogs/:id/permanent  Permanent      │
│                                                      │
│  Requires: X-API-Key header or Authorization header │
└─────────────────────────────────────────────────────┘
```

### Your API Key

**Location:** `.env` file

```bash
ADMIN_API_KEY=beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48
```

⚠️ **CRITICAL:** 
- **Never commit `.env` file to Git**
- **Never share your API key publicly**
- **Keep it secret like a password**

---

## 🚦 Rate Limiting System

### Limits Overview

| Endpoint Type | Limit | Window | Who It Applies To |
|--------------|-------|--------|-------------------|
| **Public Reads** | 100 requests | 15 minutes | Per IP address |
| **Admin Writes** | 50 requests | 1 hour | Per IP address |
| **Admin Deletes** | 20 requests | 1 hour | Per IP address |
| **Health Check** | 1000 requests | 15 minutes | Per IP address |

### What This Means

#### For Normal Users (Readers)
```
✅ Can read up to 100 blog posts in 15 minutes
✅ After 15 minutes, limit resets automatically
✅ Perfect for normal browsing
❌ If exceeded: Wait 15 minutes or see "429 Too Many Requests"
```

#### For You (Admin)
```
✅ Can create/update up to 50 blogs per hour
✅ Can delete up to 20 blogs per hour
✅ After 1 hour, limits reset automatically
✅ Plenty for normal admin operations
❌ If exceeded: Wait until reset or contact yourself 😊
```

### Rate Limit Headers

Every response includes these headers:

```http
RateLimit-Policy: 100;w=900        # 100 requests per 900 seconds
RateLimit-Limit: 100                # Maximum requests allowed
RateLimit-Remaining: 95             # Requests remaining in window
RateLimit-Reset: 847                # Seconds until limit resets
```

**How to read these:**
- `Remaining: 95` means you have 95 requests left
- `Reset: 847` means limit resets in 847 seconds (~14 minutes)
- When `Remaining: 0`, you'll get HTTP 429 error

---

## 👥 How Users Interact

### 🌐 Normal Users (Blog Readers)

**What they can do:**

1. **Read all blogs** without any authentication
2. **View blog content** freely
3. **Browse up to 100 pages in 15 minutes**

**How they access:**

```bash
# Just use the API normally - no special headers needed

# Get all blogs
curl http://api.beyondmoksha.com/api/blogs

# Get specific blog
curl http://api.beyondmoksha.com/api/blogs/my-blog-slug

# Get blog with content
curl http://api.beyondmoksha.com/api/blogs/my-blog-slug/content
```

**If they hit the rate limit:**

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again after 15 minutes",
  "retryAfter": "15 minutes"
}
```

**Status Code:** `429 Too Many Requests`

---

### 👨‍💼 You (Admin)

**What you can do:**

1. **Everything normal users can do** (read blogs)
2. **Create new blogs** (with API key)
3. **Update existing blogs** (with API key)
4. **Delete blogs** (with API key)

**How you access protected endpoints:**

#### Option 1: Using X-API-Key Header (Recommended)

```bash
curl -X POST http://localhost:8000/api/blogs \
  -H "X-API-Key: beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48" \
  -F "title=My New Blog" \
  -F "slug=my-new-blog" \
  -F "summary=Blog summary" \
  -F "tags=tech,blog" \
  -F "authorId=nishant" \
  -F "readTime=5" \
  -F "content=@blog-content.html" \
  -F "cover=@cover-image.jpg"
```

#### Option 2: Using Authorization Header

```bash
curl -X POST http://localhost:8000/api/blogs \
  -H "Authorization: Bearer beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48" \
  -F "title=My New Blog" \
  -F "..." # ... rest of fields
```

#### Option 3: Using Postman (Easy!)

**Step 1:** Open Postman

**Step 2:** Create new POST request to:
```
http://localhost:8000/api/blogs
```

**Step 3:** Go to "Headers" tab, add:
```
Key: X-API-Key
Value: beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48
```

**Step 4:** Go to "Body" tab, select "form-data", add your fields

**Step 5:** Click "Send" ✅

---

### 🖥️ Frontend Admin Dashboard (Future)

When you build your admin dashboard, here's how it will work:

```javascript
// Store API key securely in environment variable
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY;

// Create blog function
async function createBlog(blogData) {
  const formData = new FormData();
  formData.append('title', blogData.title);
  formData.append('slug', blogData.slug);
  formData.append('summary', blogData.summary);
  formData.append('tags', blogData.tags);
  formData.append('content', blogData.contentFile);
  formData.append('cover', blogData.coverFile);
  formData.append('authorId', 'nishant');
  formData.append('readTime', blogData.readTime);

  const response = await fetch('http://localhost:8000/api/blogs', {
    method: 'POST',
    headers: {
      'X-API-Key': ADMIN_API_KEY  // 🔑 API key included here
    },
    body: formData
  });

  return await response.json();
}

// Update blog function
async function updateBlog(blogId, updates) {
  const formData = new FormData();
  
  // Add only fields that changed
  if (updates.title) formData.append('title', updates.title);
  if (updates.summary) formData.append('summary', updates.summary);
  if (updates.coverFile) formData.append('cover', updates.coverFile);

  const response = await fetch(`http://localhost:8000/api/blogs/${blogId}`, {
    method: 'PUT',
    headers: {
      'X-API-Key': ADMIN_API_KEY  // 🔑 API key included here
    },
    body: formData
  });

  return await response.json();
}

// Delete blog function
async function deleteBlog(blogId) {
  const response = await fetch(`http://localhost:8000/api/blogs/${blogId}`, {
    method: 'DELETE',
    headers: {
      'X-API-Key': ADMIN_API_KEY  // 🔑 API key included here
    }
  });

  return await response.json();
}
```

---

## 🧪 Testing Examples

### Test 1: Public Read (No Auth) ✅

```bash
# Anyone can read blogs
curl http://localhost:8000/api/blogs

# Response includes rate limit headers
# RateLimit-Limit: 100
# RateLimit-Remaining: 99
# RateLimit-Reset: 900
```

**Expected:** Success, no authentication required

---

### Test 2: Create Blog Without API Key ❌

```bash
curl -X POST http://localhost:8000/api/blogs \
  -F "title=Test Blog"
```

**Response:**
```json
{
  "success": false,
  "message": "Unauthorized: API key is required for this operation",
  "hint": "Include API key in X-API-Key header or Authorization: Bearer <key> header"
}
```

**Status Code:** `401 Unauthorized`

---

### Test 3: Create Blog With Wrong API Key ❌

```bash
curl -X POST http://localhost:8000/api/blogs \
  -H "X-API-Key: wrong_key_12345" \
  -F "title=Test Blog"
```

**Response:**
```json
{
  "success": false,
  "message": "Forbidden: Invalid API key"
}
```

**Status Code:** `403 Forbidden`

---

### Test 4: Create Blog With Correct API Key ✅

```bash
curl -X POST http://localhost:8000/api/blogs \
  -H "X-API-Key: beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48" \
  -F "title=Authenticated Blog" \
  -F "slug=authenticated-blog" \
  -F "summary=This blog was created with API key authentication" \
  -F "tags=auth,test" \
  -F "authorId=nishant" \
  -F "readTime=5" \
  -F "content=@path/to/content.html" \
  -F "cover=@path/to/cover.jpg"
```

**Response:**
```json
{
  "success": true,
  "message": "Blog created successfully",
  "data": {
    "id": "...",
    "title": "Authenticated Blog",
    "slug": "authenticated-blog",
    // ... rest of blog data
  }
}
```

**Status Code:** `201 Created`

**Rate Limit Headers:**
```
RateLimit-Limit: 50         # 50 admin operations per hour
RateLimit-Remaining: 49     # 49 remaining
RateLimit-Reset: 3600       # Resets in 1 hour
```

---

### Test 5: Update Blog ✅

```bash
curl -X PUT http://localhost:8000/api/blogs/1 \
  -H "X-API-Key: beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48" \
  -F "title=Updated Title" \
  -F "summary=Updated summary"
```

---

### Test 6: Delete Blog ✅

```bash
# Soft delete (sets deletedAt timestamp)
curl -X DELETE http://localhost:8000/api/blogs/1 \
  -H "X-API-Key: beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48"

# Permanent delete (removes from DB and S3)
curl -X DELETE http://localhost:8000/api/blogs/1/permanent \
  -H "X-API-Key: beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48"
```

**Rate Limit:** 20 deletes per hour (stricter than other operations)

---

### Test 7: Exceed Rate Limit ❌

```bash
# Make 101 requests in 15 minutes (public endpoint)
for i in {1..101}; do
  curl http://localhost:8000/api/blogs
done

# The 101st request will get:
```

**Response:**
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again after 15 minutes",
  "retryAfter": "15 minutes"
}
```

**Status Code:** `429 Too Many Requests`

---

## 🔧 Rate Limit Enforcement Explained

### How Rate Limiting Works

```
Timeline: 15-minute window for public reads

┌──────────────────────────────────────────────┐
│ Request 1:  Remaining = 99                   │
│ Request 2:  Remaining = 98                   │
│ Request 3:  Remaining = 97                   │
│ ...                                          │
│ Request 99: Remaining = 1                    │
│ Request 100: Remaining = 0  ✅ Still allowed │
│ Request 101: BLOCKED! ❌ 429 Error           │
├──────────────────────────────────────────────┤
│ After 15 minutes: Counter resets to 100     │
└──────────────────────────────────────────────┘
```

### Different Limits for Different Operations

**Why different limits?**

1. **Public Reads (100/15min)**
   - Most common operation
   - Least resource intensive
   - Users need to browse freely
   - Generous limit for good UX

2. **Admin Writes (50/hour)**
   - Moderate limit
   - More resource intensive (S3 uploads, DB writes)
   - Enough for normal admin work
   - Prevents accidental abuse

3. **Admin Deletes (20/hour)**
   - Strictest limit
   - Most dangerous operation
   - Prevents accidental mass deletion
   - Forces intentional actions

4. **Health Check (1000/15min)**
   - Very generous
   - Allows monitoring tools
   - Minimal resource usage
   - Essential for uptime monitoring

### Tracking Method

Rate limits are tracked by **IP address**:

```
IP: 192.168.1.100
├─ Public reads: 95/100 remaining
├─ Admin writes: 47/50 remaining  
├─ Admin deletes: 18/20 remaining
└─ Health checks: 998/1000 remaining

Each IP has independent counters
```

### Logging

All rate limit events are logged:

```javascript
// When approaching limit
info: Rate limit approaching {
  ip: "192.168.1.100",
  path: "/api/blogs",
  remaining: 5,
  limit: 100
}

// When limit exceeded
warn: Public read rate limit exceeded {
  ip: "192.168.1.100",
  path: "/api/blogs",
  method: "GET"
}

// When API key authenticated
info: API key authenticated successfully {
  path: "/api/blogs",
  method: "POST",
  ip: "192.168.1.100"
}
```

Check logs at: `logs/combined.log`

---

## 🚨 Troubleshooting

### Problem: "Unauthorized: API key is required"

**Cause:** You're trying to create/update/delete without API key

**Solution:**
```bash
# Add the X-API-Key header
curl -X POST http://localhost:8000/api/blogs \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -F "..."
```

---

### Problem: "Forbidden: Invalid API key"

**Cause:** API key is incorrect or typo

**Solution:**
1. Check `.env` file for correct key:
   ```bash
   cat .env | grep ADMIN_API_KEY
   ```

2. Copy the EXACT key (including `beyondmoksha_admin_` prefix)

3. Verify no extra spaces or newlines

---

### Problem: "Too many requests"

**Cause:** You exceeded rate limit

**Solution:**
1. **Wait for reset:**
   - Check `RateLimit-Reset` header
   - Convert seconds to minutes
   - Wait that long

2. **Check current usage:**
   ```bash
   curl -I http://localhost:8000/api/blogs | grep RateLimit
   ```

3. **If testing, restart server to reset counters:**
   ```bash
   pkill node
   node src/server.js
   ```

---

### Problem: API key not working after server restart

**Cause:** `.env` file might have changed

**Solution:**
1. Verify `.env` file exists:
   ```bash
   ls -la .env
   ```

2. Check API key is set:
   ```bash
   cat .env | grep ADMIN_API_KEY
   ```

3. Restart server:
   ```bash
   pkill node
   node src/server.js
   ```

---

### Problem: Want to change API key

**Steps:**

1. Generate new key:
   ```bash
   node -e "console.log('beyondmoksha_admin_' + require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Update `.env` file:
   ```bash
   ADMIN_API_KEY=beyondmoksha_admin_NEW_KEY_HERE
   ```

3. Restart server:
   ```bash
   pkill node
   node src/server.js
   ```

4. Update everywhere you use the key:
   - Postman collections
   - Frontend dashboard
   - Documentation
   - Your notes

---

### Problem: Want to allow someone else to create blogs

**Solution 1: Share your API key** (Not recommended - gives full access)

**Solution 2: Generate additional keys** (Recommended)

1. Edit `.env` file:
   ```bash
   # Support multiple keys (comma-separated)
   ADMIN_API_KEYS=key1,key2,key3
   ```

2. Update middleware to check multiple keys:
   ```javascript
   const validKeys = process.env.ADMIN_API_KEYS.split(',');
   if (!validKeys.includes(apiKey)) {
     // Reject
   }
   ```

3. Give each person their own key
4. Can revoke individual keys without affecting others

---

### Problem: Monitoring rate limits in production

**Solution:** Check logs regularly

```bash
# View recent rate limit warnings
tail -f logs/combined.log | grep "rate limit"

# Count rate limit exceeded events today
grep "rate limit exceeded" logs/combined.log | wc -l

# See which IPs are hitting limits
grep "rate limit exceeded" logs/combined.log | grep -oP 'ip: "\K[^"]*' | sort | uniq -c
```

---

## 📊 Summary

### What You Implemented

✅ **API Key Authentication**
- Protects admin operations
- Simple X-API-Key header
- Secure and production-ready

✅ **Rate Limiting**
- 100 reads per 15 min (public)
- 50 writes per hour (admin)
- 20 deletes per hour (admin)
- 1000 health checks per 15 min

✅ **Proper Logging**
- All auth attempts logged
- Rate limit events tracked
- Easy monitoring

### Security Benefits

🔒 **Prevents Unauthorized Access**
- Only you can create/update/delete blogs
- Public can only read

🔒 **Prevents API Abuse**
- Rate limiting stops DDoS
- Protects server resources

🔒 **Production Ready**
- Industry-standard approach
- Scalable and maintainable

---

## 📝 Quick Reference

### Environment Variables

```bash
# .env file
ADMIN_API_KEY=beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48
```

### API Endpoints

| Endpoint | Method | Auth Required | Rate Limit |
|----------|--------|---------------|------------|
| `/api/blogs` | GET | ❌ No | 100/15min |
| `/api/blogs/:slug` | GET | ❌ No | 100/15min |
| `/api/blogs/:slug/content` | GET | ❌ No | 100/15min |
| `/api/blogs` | POST | ✅ Yes | 50/hour |
| `/api/blogs/:id` | PUT | ✅ Yes | 50/hour |
| `/api/blogs/:id` | DELETE | ✅ Yes | 20/hour |
| `/api/blogs/:id/permanent` | DELETE | ✅ Yes | 20/hour |
| `/health` | GET | ❌ No | 1000/15min |

### Headers to Include (Admin Operations)

```bash
X-API-Key: beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48
```

OR

```bash
Authorization: Bearer beyondmoksha_admin_8fec89ee62c96abe16b0538c9188129f782d6ea57469ad640a3a53b99fddbf48
```

---

## 🎉 Conclusion

Your BeyondMoksha Blog API now has:

1. ✅ Secure authentication for admin operations
2. ✅ Rate limiting to prevent abuse
3. ✅ Public read access for everyone
4. ✅ Production-ready security
5. ✅ Easy to use from Postman/Frontend

**Next Steps:**
- Use Postman to test creating blogs with your API key
- Build your frontend admin dashboard
- Monitor logs to see if limits need adjustment
- Consider adding more API keys if you have team members

**Questions?** Check the logs: `logs/combined.log`

**API Key Location:** `.env` file (never commit to Git!)

---

**Last Updated:** November 18, 2025  
**Status:** ✅ Fully Implemented and Tested
