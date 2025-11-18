# Blog Content Storage & Delivery Guide

## 📚 Overview

This document explains how blog content is stored in S3 and delivered to users in the BeyondMoksha system.

---

## 🏗️ Architecture Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │         │   Backend   │         │     S3      │
│   (React)   │────────▶│  (Express)  │────────▶│   Storage   │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │                        │
      │                        ▼                        │
      │                 ┌─────────────┐                │
      │                 │ PostgreSQL  │                │
      │                 │  (Metadata) │                │
      │                 └─────────────┘                │
      │                                                 │
      └─────────────────────────────────────────────────┘
              (Fetch content URL → Download from S3)
```

---

## 📂 Storage Structure in S3

### Current Implementation:

```
s3://beyondmoksha.com/
└── blogs/
    ├── understanding-death-care/
    │   ├── content.html              # Main blog content
    │   └── cover.jpg                 # Cover image
    ├── funeral-planning-guide/
    │   ├── content.html
    │   ├── cover.png
    │   └── images/                   # Optional: blog-specific images
    │       ├── diagram1.jpg
    │       └── infographic.png
    └── grief-counseling/
        ├── content.md                # Markdown version
        └── cover.webp
```

### URL Structure:
```
https://beyondmoksha.com.s3.ap-south-1.amazonaws.com/blogs/{slug}/content.html
https://beyondmoksha.com.s3.ap-south-1.amazonaws.com/blogs/{slug}/cover.jpg
```

---

## 🎨 Content Formats

### **Option 1: HTML (Current - Recommended)**

**Storage Format:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body>
    <h1>Understanding Death Care</h1>
    <p>Death care encompasses...</p>
    <img src="https://beyondmoksha.com.s3.amazonaws.com/blogs/understanding-death-care/images/funeral.jpg" 
         alt="Funeral service" loading="lazy" />
    <h2>Key Considerations</h2>
    <ul>
        <li>Pre-planning benefits</li>
        <li>Cost considerations</li>
        <li>Legal requirements</li>
    </ul>
</body>
</html>
```

**Frontend Rendering (React):**
```jsx
import { useEffect, useState } from 'react';

function BlogPost({ slug }) {
  const [blog, setBlog] = useState(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    // 1. Fetch blog metadata from your backend
    fetch(`http://localhost:8000/api/blogs/${slug}`)
      .then(res => res.json())
      .then(data => {
        setBlog(data.data);
        
        // 2. Fetch HTML content from S3
        return fetch(data.data.contentUrl);
      })
      .then(res => res.text())
      .then(html => {
        setContent(html);
      });
  }, [slug]);

  if (!blog) return <div>Loading...</div>;

  return (
    <article className="blog-post">
      {/* Cover Image */}
      {blog.coverImageUrl && (
        <img src={blog.coverImageUrl} alt={blog.title} className="cover" />
      )}
      
      {/* Metadata */}
      <h1>{blog.title}</h1>
      <div className="meta">
        <span>{blog.readTime} min read</span>
        <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
      </div>
      
      {/* Content from S3 */}
      <div 
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      
      {/* Tags */}
      <div className="tags">
        {blog.tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
    </article>
  );
}
```

**CSS for Content:**
```css
/* Style the rendered HTML content */
.blog-content {
  font-family: Georgia, serif;
  line-height: 1.8;
  color: #333;
}

.blog-content h1 {
  font-size: 2.5em;
  margin-top: 1em;
}

.blog-content h2 {
  font-size: 2em;
  margin-top: 1.5em;
  color: #444;
}

.blog-content p {
  margin: 1em 0;
  font-size: 1.1em;
}

.blog-content img {
  max-width: 100%;
  height: auto;
  margin: 2em 0;
  border-radius: 8px;
}

.blog-content a {
  color: #0066cc;
  text-decoration: underline;
}
```

---

### **Option 2: Markdown (Alternative)**

**Storage Format:**
```markdown
# Understanding Death Care

Death care encompasses...

![Funeral service](https://beyondmoksha.com.s3.amazonaws.com/blogs/understanding-death-care/images/funeral.jpg)

## Key Considerations

- Pre-planning benefits
- Cost considerations
- Legal requirements
```

**Frontend Rendering (React with react-markdown):**
```jsx
import ReactMarkdown from 'react-markdown';
import { useEffect, useState } from 'react';

function BlogPost({ slug }) {
  const [blog, setBlog] = useState(null);
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    // Fetch metadata
    fetch(`http://localhost:8000/api/blogs/${slug}`)
      .then(res => res.json())
      .then(data => {
        setBlog(data.data);
        
        // Fetch Markdown from S3
        return fetch(data.data.contentUrl);
      })
      .then(res => res.text())
      .then(md => {
        setMarkdown(md);
      });
  }, [slug]);

  if (!blog) return <div>Loading...</div>;

  return (
    <article className="blog-post">
      <h1>{blog.title}</h1>
      
      {/* Render Markdown */}
      <ReactMarkdown className="blog-content">
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
```

---

## 🔒 Security Considerations

### **HTML Sanitization (CRITICAL)**

When accepting HTML from users, you **MUST** sanitize it to prevent XSS attacks:

```javascript
// Backend - Before uploading to S3
const DOMPurify = require('isomorphic-dompurify');

const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'img'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
});

// Upload sanitized HTML to S3
await uploadBlogContent(sanitizedHtml, slug, 'text/html');
```

**Why this matters:**
```html
<!-- ❌ Malicious HTML -->
<img src="x" onerror="alert('Hacked!')">
<script>stealCookies()</script>

<!-- ✅ Sanitized HTML -->
<img src="x" alt="">
```

---

## 🚀 Performance Optimization

### **1. Lazy Loading Images**

Add `loading="lazy"` to all images in content:

```html
<img src="..." alt="..." loading="lazy" decoding="async" />
```

### **2. CDN/CloudFront**

For better performance, use CloudFront CDN:

```
Direct S3: https://beyondmoksha.com.s3.ap-south-1.amazonaws.com/blogs/...
CloudFront: https://cdn.beyondmoksha.com/blogs/...
```

**Benefits:**
- ⚡ Faster content delivery (edge locations)
- 💰 Lower S3 costs (cached at edge)
- 🔒 SSL/HTTPS included

### **3. Content Caching**

Cache blog content on frontend:

```javascript
// Using React Query or SWR
import useSWR from 'swr';

function BlogPost({ slug }) {
  const { data: blog } = useSWR(`/api/blogs/${slug}`);
  const { data: content } = useSWR(
    blog?.contentUrl,
    (url) => fetch(url).then(r => r.text()),
    { revalidateOnFocus: false } // Cache forever
  );
  
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
```

---

## 📊 Real-World Comparison

### **Medium.com:**
```
Storage: JSON blocks in database
Delivery: Server-side rendered HTML
Caching: Aggressive CDN caching
```

### **WordPress:**
```
Storage: HTML in database
Delivery: PHP generates full page
Caching: WP Super Cache plugin
```

### **Ghost:**
```
Storage: Markdown in database
Delivery: Convert to HTML on-the-fly
Caching: Redis cache layer
```

### **Your System (BeyondMoksha):**
```
Storage: HTML/Markdown in S3
Metadata: PostgreSQL
Delivery: Direct S3 URLs
Caching: Browser + optional CDN
```

---

## 🎯 Recommended Workflow

### **For Blog Creation:**

1. **User writes blog** in rich text editor or Markdown
2. **Frontend sends** content as HTML file in multipart/form-data
3. **Backend receives** and sanitizes HTML (optional but recommended)
4. **Backend uploads** to S3: `blogs/{slug}/content.html`
5. **Backend saves** S3 URL + metadata to PostgreSQL
6. **Returns** blog object with `contentUrl`

### **For Blog Reading:**

1. **User navigates** to blog page: `/blog/understanding-death-care`
2. **Frontend fetches** metadata: `GET /api/blogs/understanding-death-care`
3. **Receives** blog object with `contentUrl`
4. **Frontend fetches** content: `GET https://beyondmoksha.com.s3.../content.html`
5. **Renders** HTML in page with `dangerouslySetInnerHTML`
6. **Applies** custom CSS styling

---

## 🛠️ Implementation Steps

### **Step 1: Backend (Already Done ✅)**
```javascript
// Your current backend uploads HTML to S3 and stores URL in PostgreSQL
POST /api/blogs → Uploads content.html → Returns contentUrl
```

### **Step 2: Frontend (Your Task)**

**Create BlogReader Component:**
```jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function BlogReader() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBlog() {
      try {
        // Fetch metadata
        const metaResponse = await fetch(`http://localhost:8000/api/blogs/${slug}`);
        const { data } = await metaResponse.json();
        setBlog(data);
        
        // Fetch content from S3
        const contentResponse = await fetch(data.contentUrl);
        const html = await contentResponse.text();
        setContent(html);
      } catch (error) {
        console.error('Error loading blog:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadBlog();
  }, [slug]);

  if (loading) return <div>Loading...</div>;
  if (!blog) return <div>Blog not found</div>;

  return (
    <article className="blog-post-container">
      {/* Cover Image */}
      {blog.coverImageUrl && (
        <div className="cover-image-container">
          <img src={blog.coverImageUrl} alt={blog.title} />
        </div>
      )}
      
      {/* Header */}
      <header>
        <h1>{blog.title}</h1>
        {blog.summary && <p className="summary">{blog.summary}</p>}
        <div className="meta">
          <span>{blog.readTime} min read</span>
          <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
          <span>{blog.views} views</span>
        </div>
      </header>
      
      {/* Content */}
      <div 
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      
      {/* Tags */}
      {blog.tags.length > 0 && (
        <div className="tags">
          {blog.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}
```

---

## 🎨 Styling the Blog Content

```css
/* blog-post.css */
.blog-post-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.cover-image-container img {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.blog-post-container h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1a1a1a;
}

.summary {
  font-size: 1.25rem;
  color: #666;
  margin-bottom: 1.5rem;
}

.meta {
  display: flex;
  gap: 1.5rem;
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #eee;
}

/* Style the actual blog content */
.blog-content {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.125rem;
  line-height: 1.8;
  color: #333;
}

.blog-content h1,
.blog-content h2,
.blog-content h3 {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 600;
  margin-top: 2em;
  margin-bottom: 0.5em;
  color: #1a1a1a;
}

.blog-content p {
  margin: 1.5em 0;
}

.blog-content img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 2rem auto;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.blog-content a {
  color: #0066cc;
  text-decoration: none;
  border-bottom: 1px solid #0066cc;
}

.blog-content a:hover {
  color: #0052a3;
}

.blog-content ul,
.blog-content ol {
  padding-left: 2rem;
  margin: 1.5em 0;
}

.blog-content li {
  margin: 0.5em 0;
}

.blog-content blockquote {
  border-left: 4px solid #0066cc;
  padding-left: 1.5rem;
  margin: 2rem 0;
  font-style: italic;
  color: #555;
}

.blog-content code {
  background: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.tag {
  background: #f0f0f0;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #555;
}
```

---

## ✅ Summary

**Current System:**
1. ✅ Backend uploads HTML/Markdown to S3
2. ✅ PostgreSQL stores metadata + S3 URL
3. ✅ API returns `contentUrl`
4. ⏳ Frontend needs to fetch and render content

**Next Steps:**
1. Create `BlogReader` component on frontend
2. Fetch content from S3 URL
3. Render with `dangerouslySetInnerHTML`
4. Apply custom CSS styling
5. (Optional) Add sanitization on backend
6. (Optional) Set up CloudFront CDN

**Your system is production-ready!** 🚀
