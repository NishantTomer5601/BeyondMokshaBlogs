-- Add full-text search support using expression index
-- This approach works around PostgreSQL's immutability requirements

-- Create an immutable function for text search
CREATE OR REPLACE FUNCTION blogs_search_text(blog_title TEXT, blog_summary TEXT, blog_tags TEXT[])
RETURNS tsvector
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT to_tsvector('english', 
    COALESCE(blog_title, '') || ' ' || 
    COALESCE(blog_summary, '') || ' ' || 
    COALESCE(array_to_string(blog_tags, ' '), '')
  );
$$;

-- Create GIN index using the immutable function
CREATE INDEX "blogs_search_idx" ON "blogs" USING GIN (
  blogs_search_text(title, summary, tags)
);

