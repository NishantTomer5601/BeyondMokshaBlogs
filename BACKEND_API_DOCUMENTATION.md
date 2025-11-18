# BeyondMoksha Backend API Documentation

**Last Updated:** November 15, 2025  
**Base URL:** `http://localhost:8000` (Development)  
**API Prefix:** `/api`

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Formats](#requestresponse-formats)
5. [Key Changes & Implementation](#key-changes--implementation)
6. [Frontend Integration Guide](#frontend-integration-guide)
7. [Error Handling](#error-handling)

---

## 🎯 Overview

### Tech Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM v5.19.0
- **Storage:** AWS S3 (ap-south-1 region)
- **Bucket:** `beyondmoksha.com`
- **File Upload:** Multer (multipart/form-data)
- **Validation:** express-validator

### Key Features Implemented
✅ Full CRUD operations for blogs  
✅ S3 integration for HTML content storage  
✅ Presigned URLs for cover images (1 hour expiry)  
✅ Single-call blog reading (metadata + content in one request)  
✅ View count tracking  
✅ Soft delete with permanent delete option  
✅ Tag system with validation  
✅ SEO-friendly slugs  

### Current Status
🟢 **Server Running:** Port 8000  
🟢 **Database:** PostgreSQL connected  
🟢 **S3 Bucket:** `beyondmoksha.com` (private bucket with presigned URLs)  
🔴 **Search:** Full-text search currently disabled (will be re-enabled later)

---

## 📊 Database Schema

### Blog Model (Prisma Schema)

```prisma
model Blog {
  id            Int       @id @default(autoincrement())
  title         String
  slug          String    @unique
  authorId      Int?
  summary       String?
  tags          String[]
  contentUrl    String    // S3 URL: s3://beyondmoksha.com/blogs/{slug}/content.html
  coverImageUrl String?   // S3 URL: s3://beyondmoksha.com/blogs/{slug}/cover.{ext}
  readTime      Int?      // Minutes
  views         Int       @default(0)
  likes         Int       @default(0)
  status        String    @default("draft")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // Soft delete timestamp

  @@index([slug])
  @@index([status])
  @@index([deletedAt])
  @@map("blogs")
}
```

### Field Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | Integer | Auto | Primary key |
| `title` | String | ✅ Yes | Blog title |
| `slug` | String | ✅ Yes | URL-friendly unique identifier |
| `authorId` | Integer | Optional | Author/creator ID |
| `summary` | String | Optional | Short description/excerpt |
| `contentUrl` | String | ✅ Yes | S3 path to HTML content file |
| `coverImageUrl` | String | Optional | S3 path to cover image |
| `tags` | String[] | Optional | Array of tags (e.g., ["death-care", "funeral"]) |
| `readTime` | Integer | Optional | Estimated reading time in minutes |
| `views` | Integer | Auto | View counter (default: 0) |
| `likes` | Integer | Auto | Likes counter (default: 0) |
| `status` | String | Auto | "draft" or "published" (default: "draft") |
| `createdAt` | DateTime | Auto | Creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |
| `deletedAt` | DateTime | Auto | Soft delete timestamp (null if not deleted) |

---

## 🔌 API Endpoints

### 1. List All Blogs
**Get paginated list of blogs with optional filters**

```http
GET /api/blogs?page=1&limit=20&tags=death-care,funeral&search=death&status=published
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `tags` (optional): Comma-separated tags to filter by
- `search` (optional): Search in title and summary
- `status` (optional): "draft" or "published" (default: "published")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Understanding Death Care Services",
      "slug": "understanding-death-care",
      "authorId": null,
      "summary": "Death care services encompass a wide range...",
      "tags": ["death-care", "funeral", "planning"],
      "contentUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/content.html",
      "coverImageUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/cover.jpg",
      "readTime": 5,
      "views": 4,
      "likes": 0,
      "status": "published",
      "createdAt": "2025-01-11T10:30:00.000Z",
      "updatedAt": "2025-01-11T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 4,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasMore": false
  }
}
```

**Notes:**
- Only returns blogs where `deletedAt = null` (not soft deleted)
- Does NOT include full HTML content (use endpoint #3 for that)
- Cover images are raw S3 URLs (not presigned in list view)

---

### 2. Get Blog by Slug (Metadata Only)
**Get blog metadata without HTML content**

```http
GET /api/blogs/:slug
```

**URL Parameters:**
- `slug`: Blog slug (e.g., "understanding-death-care")

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Understanding Death Care Services",
    "slug": "understanding-death-care",
    "authorId": null,
    "summary": "Death care services encompass a wide range...",
    "tags": ["death-care", "funeral", "planning", "grief-support"],
    "contentUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/content.html",
    "coverImageUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/cover.jpg",
    "readTime": 5,
    "views": 5,
    "likes": 0,
    "status": "published",
    "createdAt": "2025-01-11T10:30:00.000Z",
    "updatedAt": "2025-01-11T10:30:00.000Z",
    "deletedAt": null
  }
}
```

**Notes:**
- Automatically increments view count
- Returns raw S3 URLs (not presigned)
- Does NOT include HTML content
- Use Case: When you only need metadata (e.g., blog preview cards)

---

### 3. Get Blog with Full Content ⭐ **NEW - Use This for Reading**
**Get complete blog data including HTML content in ONE API call**

```http
GET /api/blogs/:slug/content
```

**URL Parameters:**
- `slug`: Blog slug (e.g., "understanding-death-care")

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Understanding Death Care Services",
    "slug": "understanding-death-care",
    "authorId": null,
    "summary": "Death care services encompass a wide range...",
    "tags": ["death-care", "funeral", "planning", "grief-support"],
    "coverImageUrl": "https://s3.presigned-url.../cover.jpg?X-Amz-...",
    "readTime": 5,
    "views": 5,
    "likes": 0,
    "status": "published",
    "createdAt": "2025-01-11T10:30:00.000Z",
    "updatedAt": "2025-01-11T10:30:00.000Z",
    "content": "<!DOCTYPE html><html><body><h1>Understanding Death Care Services</h1><p>Full HTML content here...</p></body></html>"
  }
}
```

**Key Features:**
- ✅ Returns **full HTML content** from S3 in `content` field
- ✅ Automatically increments view count
- ✅ Generates presigned URL for cover image (valid 1 hour)
- ✅ Single API call - no need to fetch from S3 separately
- ✅ No CORS issues (backend fetches from S3)

**Use Case:** When user clicks to read a blog post

---

### 4. Create New Blog
**Upload a new blog with HTML content and optional cover image**

```http
POST /api/blogs
Content-Type: multipart/form-data
```

**Form Data Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | String | ✅ Yes | Blog title (min 3 chars) |
| `slug` | String | ✅ Yes | Unique URL slug (alphanumeric + hyphens) |
| `content` | File | ✅ Yes | HTML file (.html) |
| `summary` | String | Optional | Short description/excerpt |
| `cover` | File | Optional | Image file (jpg, jpeg, png, webp, gif) |
| `tags` | String | Optional | JSON array as string: `'["tag1","tag2"]'` |
| `authorId` | Number | Optional | Author ID |
| `readTime` | Number | Optional | Reading time in minutes |
| `status` | String | Optional | "draft" or "published" (default: "draft") |

**Example using JavaScript Fetch:**
```javascript
const formData = new FormData();
formData.append('title', 'Understanding Death Care Services');
formData.append('slug', 'understanding-death-care');
formData.append('content', htmlFile); // File object (required)
formData.append('cover', imageFile); // File object (optional)
formData.append('summary', 'A comprehensive guide to death care...');
formData.append('tags', JSON.stringify(['death-care', 'funeral', 'planning']));
formData.append('authorId', '1');
formData.append('readTime', '5');
formData.append('status', 'published');

const response = await fetch('http://localhost:8000/api/blogs', {
  method: 'POST',
  body: formData
  // Don't set Content-Type header - browser sets it automatically
});
```

**Response:**
```json
{
  "success": true,
  "message": "Blog created successfully",
  "data": {
    "id": 5,
    "title": "Understanding Death Care Services",
    "slug": "understanding-death-care",
    "authorId": 1,
    "summary": "A comprehensive guide to death care...",
    "tags": ["death-care", "funeral", "planning"],
    "contentUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/content.html",
    "coverImageUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/cover.jpg",
    "readTime": 5,
    "views": 0,
    "likes": 0,
    "status": "published",
    "createdAt": "2025-11-15T08:45:00.000Z",
    "updatedAt": "2025-11-15T08:45:00.000Z",
    "deletedAt": null
  }
}
```

**Validation Rules:**
- `title`: Min 3 characters
- `slug`: Alphanumeric + hyphens only, must be unique
- `content`: Must be HTML file (required)
- `cover`: Must be image file (jpg, jpeg, png, webp, gif)
- `tags`: If provided, must be valid JSON array or will be converted to empty array
- `readTime`: Must be positive integer
- `status`: Must be "draft" or "published"

---

### 5. Update Existing Blog
**Update blog metadata, content, or cover image**

```http
PUT /api/blogs/:id
Content-Type: multipart/form-data
```

**URL Parameters:**
- `id`: Blog ID (integer, e.g., 1)

**Form Data Fields:** (All optional - only send fields you want to update)

| Field | Type | Description |
|-------|------|-------------|
| `title` | String | New title |
| `slug` | String | New slug (must be unique) |
| `content` | File | New HTML file |
| `summary` | String | New summary/excerpt |
| `cover` | File | New cover image |
| `tags` | String | New tags as JSON array string |
| `authorId` | Number | New author ID |
| `readTime` | Number | New reading time |
| `status` | String | "draft" or "published" |
| `views` | Number | Update view count |
| `likes` | Number | Update likes count |

**Example:**
```javascript
const formData = new FormData();
formData.append('title', 'Updated Title');
formData.append('content', newHtmlFile);
formData.append('status', 'published');

const response = await fetch('http://localhost:8000/api/blogs/1', {
  method: 'PUT',
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "message": "Blog updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Title",
    "slug": "understanding-death-care",
    "authorId": 1,
    "summary": "Updated summary...",
    "tags": ["death-care", "funeral"],
    "contentUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/content.html",
    "coverImageUrl": "s3://beyondmoksha.com/blogs/understanding-death-care/cover.jpg",
    "readTime": 5,
    "views": 10,
    "likes": 2,
    "status": "published",
    "createdAt": "2025-01-11T10:30:00.000Z",
    "updatedAt": "2025-11-15T09:00:00.000Z",
    "deletedAt": null
  }
}
```

**Notes:**
- If slug is changed, S3 files are NOT moved automatically
- Old S3 files are overwritten if new files are uploaded
- View count and likes can be manually updated
- Only provided fields are updated

---

### 6. Soft Delete Blog
**Mark blog as deleted without removing from database**

```http
DELETE /api/blogs/:id
```

**URL Parameters:**
- `id`: Blog ID (integer, e.g., 1)

**Response:**
```json
{
  "success": true,
  "message": "Blog deleted successfully"
}
```

**Notes:**
- Sets `deletedAt` timestamp to current date/time
- Blog won't appear in list/get endpoints (where deletedAt = null)
- Can be restored by setting `deletedAt` back to null
- S3 files remain intact

---

### 7. Permanent Delete Blog
**Completely remove blog from database and S3**

```http
DELETE /api/blogs/:id/permanent
```

**URL Parameters:**
- `id`: Blog ID (integer, e.g., 1)

**Response:**
```json
{
  "success": true,
  "message": "Blog permanently deleted"
}
```

**⚠️ Warning:** 
- Deletes database record permanently
- Deletes all S3 files (content.html, cover image) from entire blog folder
- **Cannot be undone**

---

## 🔄 Request/Response Formats

### Multipart Form Data (File Uploads)

When creating or updating blogs with files:

```javascript
// ✅ Correct
const formData = new FormData();
formData.append('title', 'My Blog');
formData.append('content', htmlFile);
formData.append('tags', JSON.stringify(['tag1', 'tag2'])); // Array as JSON string

fetch('/api/blogs', {
  method: 'POST',
  body: formData
  // Don't set Content-Type - browser handles it
});
```

```javascript
// ❌ Incorrect
fetch('/api/blogs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }, // Wrong for file uploads
  body: JSON.stringify({ title: 'My Blog' }) // Can't send files this way
});
```

### Tags Format

**In Request:**
```javascript
// Send as JSON string
formData.append('tags', JSON.stringify(['death-care', 'funeral']));

// Or send nothing for empty tags (will default to [])
```

**In Response:**
```json
{
  "tags": ["death-care", "funeral"] // Always returned as array
}
```

**Validation:**
- Invalid tags input (like `"h"` or `"invalid"`) → Converted to `[]`
- Valid JSON array → Parsed and stored correctly
- Empty/missing → Defaults to `[]`

### Status Field

**Valid Values:**
- `"draft"` - Blog is not published yet (default)
- `"published"` - Blog is live and visible to users

**In Request:**
```javascript
formData.append('status', 'published');
```

**In Response:**
```json
{
  "status": "published"
}
```

### Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [ // Optional, for validation errors
    {
      "field": "title",
      "message": "Title must be at least 3 characters long"
    }
  ]
}
```

**Common Error Codes:**

| Status | Meaning | Example |
|--------|---------|---------|
| 400 | Bad Request | Invalid input, validation failed |
| 404 | Not Found | Blog with given slug doesn't exist |
| 409 | Conflict | Slug already exists |
| 500 | Server Error | Database or S3 error |

---

## 🔧 Key Changes & Implementation

### 1. ⭐ Single-Call Blog Reading (Most Important)

**What Changed:**
- **Before:** Frontend needed 2 API calls to read a blog:
  1. `GET /api/blogs/:slug` → get metadata
  2. Fetch presigned S3 URL → get HTML content
  
- **Now:** ONE API call does everything:
  - `GET /api/blogs/:slug/content` → get metadata + HTML content

**Implementation:**
```javascript
// blogController.js - getBlogContent()
export const getBlogContent = async (req, res) => {
  const { slug } = req.params;
  
  // 1. Get blog from database
  const blog = await prisma.blog.findUnique({
    where: { slug }
  });
  
  if (!blog || blog.deletedAt) {
    return res.status(404).json({
      success: false,
      message: 'Blog not found'
    });
  }
  
  // 2. Extract S3 key from contentUrl
  const s3Key = extractS3Key(blog.contentUrl);
  
  // 3. Fetch HTML from S3
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  const getCommand = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: s3Key
  });
  const s3Response = await s3Client.send(getCommand);
  const htmlContent = await s3Response.Body.transformToString();
  
  // 4. Increment view count (async, don't wait)
  prisma.blog.update({
    where: { id: blog.id },
    data: { views: { increment: 1 } }
  }).catch(err => console.error('Failed to increment views:', err));
  
  // 5. Generate presigned URL for cover image
  let presignedCoverUrl = blog.coverImageUrl;
  if (blog.coverImageUrl) {
    const coverKey = extractS3Key(blog.coverImageUrl);
    if (coverKey) {
      presignedCoverUrl = await generatePresignedUrl(coverKey, 3600);
    }
  }
  
  // 6. Return everything
  res.json({
    success: true,
    data: {
      ...blog,
      content: htmlContent, // ← Full HTML included
      coverImageUrl: presignedCoverUrl, // ← Presigned URL
      views: blog.views + 1 // ← Return incremented count
    }
  });
};
```

**Benefits:**
- ✅ Simpler frontend code (one fetch call)
- ✅ No CORS issues (backend handles S3)
- ✅ No presigned URL management in frontend
- ✅ Automatic view count increment

---

### 2. Tags Validation Fix

**Problem:** Multipart form data sends everything as strings. When frontend sent `tags="h"`, backend rejected it as "invalid JSON array".

**Solution:** Added custom sanitizer that gracefully handles invalid input:

```javascript
// validateRequest.js
body('tags')
  .optional()
  .customSanitizer(value => {
    // If tags is invalid (not a JSON array), convert to empty string
    if (!value || typeof value !== 'string') return '';
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? value : '';
    } catch {
      return ''; // Invalid JSON → empty string
    }
  })
  .custom((value) => {
    if (!value || value === '') return true; // Allow empty
    const parsed = JSON.parse(value);
    return Array.isArray(parsed);
  })
```

**Result:**
- `tags="h"` → Converts to `[]` (no error)
- `tags='["valid","tags"]'` → Stores correctly
- `tags=""` or missing → Defaults to `[]`

---

### 3. Presigned URLs for Cover Images

**Why:** S3 bucket is private for security. Direct URLs don't work.

**Implementation:**
```javascript
// presignedUrl.js
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const generatePresignedUrl = async (s3Key, expiresIn = 3600) => {
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: s3Key
  });
  return await getSignedUrl(s3Client, command, { expiresIn });
};
```

**Usage:**
- All cover image URLs in API responses are presigned
- Valid for 1 hour (3600 seconds)
- No special handling needed in frontend - just use the URL

---

### 4. S3 Storage Structure

**Bucket Name:** `beyondmoksha.com`  
**Region:** `ap-south-1` (Mumbai)

**File Organization:**
```
s3://beyondmoksha.com/
├── blogs/
│   ├── understanding-death-care/
│   │   ├── content.html          ← Blog HTML content
│   │   └── cover.jpg             ← Cover image
│   ├── funeral-planning-guide/
│   │   ├── content.html
│   │   └── cover.png
│   └── {slug}/
│       ├── content.html          ← Always named content.html
│       └── cover.{ext}           ← Extension based on upload
```

**Content Storage:**
- HTML files stored with complete markup
- Can include inline CSS, but images should be separate S3 links
- Sanitization handled by frontend before upload

---

### 5. Search Functionality Status

**Current:** ⚠️ **DISABLED**

The full-text search functionality is currently commented out:

```javascript
// blogRoutes.js - COMMENTED OUT
// router.get('/search', blogController.searchBlogs);

// server.js - COMMENTED OUT
// app.use('/api/blogs/search', blogRoutes);
```

**Database Setup (Existing):**
- PostgreSQL function: `blogs_search_text()` (IMMUTABLE)
- GIN index on search text
- Ready to be re-enabled when needed

**To Re-enable:** Uncomment the routes above

---

## 📱 Frontend Integration Guide

### React Example: Blog Reader Component

```jsx
import React, { useState, useEffect } from 'react';

function BlogReader({ slug }) {
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        // ⭐ ONE API CALL - gets everything!
        const response = await fetch(
          `http://localhost:8000/api/blogs/${slug}/content`
        );
        const data = await response.json();
        
        if (data.success) {
          setBlog(data.data);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('Failed to load blog');
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

  if (loading) return <div>Loading blog...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!blog) return <div>Blog not found</div>;

  return (
    <article className="blog-post">
      {/* Cover Image */}
      {blog.coverImageUrl && (
        <img 
          src={blog.coverImageUrl} 
          alt={blog.title}
          className="cover-image"
        />
      )}

      {/* Metadata */}
      <header>
        <h1>{blog.title}</h1>
        <div className="meta">
          <span>{blog.readTime} min read</span>
          <span>•</span>
          <span>{blog.views} views</span>
          <span>•</span>
          <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
        </div>
        {blog.tags.length > 0 && (
          <div className="tags">
            {blog.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </header>

      {/* HTML Content from S3 */}
      <div 
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />
    </article>
  );
}

export default BlogReader;
```

### React Example: Blog List Component

```jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function BlogList() {
  const [blogs, setBlogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8000/api/blogs?page=${page}&limit=10&status=published`
        );
        const result = await response.json();
        
        if (result.success) {
          setBlogs(result.data); // data is array directly
          setPagination(result.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch blogs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [page]);

  if (loading) return <div>Loading blogs...</div>;

  return (
    <div className="blog-list">
      <h1>Latest Blogs</h1>
      
      <div className="blogs-grid">
        {blogs.map(blog => (
          <article key={blog.id} className="blog-card">
            {blog.coverImageUrl && (
              <img 
                src={blog.coverImageUrl} 
                alt={blog.title}
              />
            )}
            <h2>
              <Link to={`/blog/${blog.slug}`}>
                {blog.title}
              </Link>
            </h2>
            <p className="summary">{blog.summary}</p>
            <div className="meta">
              <span>{blog.readTime} min read</span>
              <span>•</span>
              <span>{blog.views} views</span>
              <span>•</span>
              <span>{blog.likes} likes</span>
            </div>
            {blog.tags && blog.tags.length > 0 && (
              <div className="tags">
                {blog.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="pagination">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button 
            disabled={!pagination.hasMore}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default BlogList;
```

### React Example: Blog Upload Form

```jsx
import React, { useState } from 'react';

function BlogUploadForm() {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    tags: '',
    authorId: '',
    readTime: '',
    status: 'draft'
  });
  const [contentFile, setContentFile] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    // Create FormData object
    const data = new FormData();
    data.append('title', formData.title);
    data.append('slug', formData.slug);
    data.append('summary', formData.summary);
    data.append('status', formData.status);
    
    // Convert tags to JSON array
    if (formData.tags) {
      const tagsArray = formData.tags.split(',').map(t => t.trim());
      data.append('tags', JSON.stringify(tagsArray));
    }
    
    if (formData.authorId) {
      data.append('authorId', formData.authorId);
    }
    
    if (formData.readTime) {
      data.append('readTime', formData.readTime);
    }
    
    // Append files
    if (contentFile) {
      data.append('content', contentFile);
    }
    if (coverImage) {
      data.append('cover', coverImage);
    }

    try {
      const response = await fetch('http://localhost:8000/api/blogs', {
        method: 'POST',
        body: data
        // Don't set Content-Type header - browser handles it
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Blog created successfully!');
        // Redirect or reset form
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create New Blog</h2>

      <input
        type="text"
        placeholder="Title"
        value={formData.title}
        onChange={e => setFormData({...formData, title: e.target.value})}
        required
      />

      <input
        type="text"
        placeholder="Slug (URL-friendly)"
        value={formData.slug}
        onChange={e => setFormData({...formData, slug: e.target.value})}
        required
      />

      <textarea
        placeholder="Summary (optional)"
        value={formData.summary}
        onChange={e => setFormData({...formData, summary: e.target.value})}
      />

      <input
        type="text"
        placeholder="Tags (comma-separated: death-care, funeral)"
        value={formData.tags}
        onChange={e => setFormData({...formData, tags: e.target.value})}
      />

      <input
        type="number"
        placeholder="Author ID (optional)"
        value={formData.authorId}
        onChange={e => setFormData({...formData, authorId: e.target.value})}
      />

      <input
        type="number"
        placeholder="Read Time (minutes)"
        value={formData.readTime}
        onChange={e => setFormData({...formData, readTime: e.target.value})}
      />

      <select
        value={formData.status}
        onChange={e => setFormData({...formData, status: e.target.value})}
      >
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>

      <div>
        <label>HTML Content File:</label>
        <input
          type="file"
          accept=".html"
          onChange={e => setContentFile(e.target.files[0])}
          required
        />
      </div>

      <div>
        <label>Cover Image (optional):</label>
        <input
          type="file"
          accept="image/*"
          onChange={e => setCoverImage(e.target.files[0])}
        />
      </div>

      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Create Blog'}
      </button>
    </form>
  );
}

export default BlogUploadForm;
```

---

## ⚠️ Error Handling

### Common Error Scenarios

**1. Blog Not Found (404)**
```json
{
  "success": false,
  "message": "Blog not found"
}
```
**Frontend Action:** Show 404 page or "Blog not found" message

---

**2. Validation Error (400)**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title must be at least 3 characters long"
    },
    {
      "field": "slug",
      "message": "Slug can only contain letters, numbers, and hyphens"
    }
  ]
}
```
**Frontend Action:** Display field-specific errors next to form inputs

---

**3. Duplicate Slug (409)**
```json
{
  "success": false,
  "message": "A blog with this slug already exists"
}
```
**Frontend Action:** Show error and ask user to choose different slug

---

**4. File Upload Error (400)**
```json
{
  "success": false,
  "message": "Content file is required"
}
```
**Frontend Action:** Ensure required files are selected

---

**5. S3 Error (500)**
```json
{
  "success": false,
  "message": "Failed to upload to S3",
  "error": "S3 error details..."
}
```
**Frontend Action:** Show "Upload failed, please try again"

---

## 🔐 Security Notes

### Current Implementation
- ✅ S3 bucket is private (not publicly accessible)
- ✅ Presigned URLs expire after 1 hour
- ✅ Input validation on all endpoints
- ✅ Soft delete preserves data
- ⚠️ **No authentication/authorization implemented yet**

### Future Enhancements Needed
- [ ] JWT-based authentication
- [ ] Role-based access control (admin vs reader)
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] Content Security Policy headers

---

## 🚀 Quick Start for Frontend

### 1. Base Configuration

```javascript
// config.js
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
export const API_ENDPOINTS = {
  BLOGS: '/api/blogs',
  BLOG_BY_SLUG: (slug) => `/api/blogs/${slug}`,
  BLOG_CONTENT: (slug) => `/api/blogs/${slug}/content`,
  CREATE_BLOG: '/api/blogs',
  UPDATE_BLOG: (id) => `/api/blogs/${id}`,
  DELETE_BLOG: (id) => `/api/blogs/${id}`,
  PERMANENT_DELETE: (id) => `/api/blogs/${id}/permanent`
};
```

### 2. API Service Helper

```javascript
// services/blogService.js
import { API_BASE_URL, API_ENDPOINTS } from '../config';

export const blogService = {
  // Get all blogs
  async getBlogs(page = 1, limit = 10, status = 'published') {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.BLOGS}?page=${page}&limit=${limit}&status=${status}`
    );
    return response.json();
  },

  // Get single blog with full content
  async getBlogContent(slug) {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.BLOG_CONTENT(slug)}`
    );
    return response.json();
  },

  // Create blog
  async createBlog(formData) {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.CREATE_BLOG}`,
      {
        method: 'POST',
        body: formData // FormData object
      }
    );
    return response.json();
  },

  // Update blog
  async updateBlog(id, formData) {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.UPDATE_BLOG(id)}`,
      {
        method: 'PUT',
        body: formData
      }
    );
    return response.json();
  },

  // Delete blog (soft)
  async deleteBlog(id) {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.DELETE_BLOG(id)}`,
      {
        method: 'DELETE'
      }
    );
    return response.json();
  }
};
```

### 3. Usage in Components

```javascript
import { blogService } from './services/blogService';

// In your component
const fetchBlogContent = async (slug) => {
  const result = await blogService.getBlogContent(slug);
  if (result.success) {
    setBlog(result.data);
  }
};
```

---

## 📞 Support & Questions

For any questions or issues:
1. Check this documentation first
2. Review error responses for specific details
3. Test endpoints in Postman using examples above
4. Check server logs for backend errors

---

**Document Version:** 1.0  
**Last Updated:** November 15, 2025  
**Backend Version:** Node.js 18+, Prisma 5.19.0  
**API Status:** ✅ Production Ready (except search)
