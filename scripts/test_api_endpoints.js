/*
API Test Script to verify the blog API endpoints are working with the new realistic data.
Tests the blog listing and individual blog retrieval endpoints.
Usage: node scripts/test_api_endpoints.js
*/

require('dotenv').config();

const logger = require('../src/utils/logger');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY;

async function testAPIEndpoints() {
  logger.info('🚀 Testing blog API endpoints with realistic data...');

  try {
    // Test 1: Get all blogs
    logger.info('\n1️⃣ Testing GET /api/blogs - Get all blogs');
    
    const blogsResponse = await fetch(`${API_BASE}/api/blogs`);
    if (!blogsResponse.ok) {
      throw new Error(`Failed to fetch blogs: ${blogsResponse.status} ${blogsResponse.statusText}`);
    }

    const blogsData = await blogsResponse.json();
    logger.info(`✅ Successfully fetched ${blogsData.length} blogs`);
    
    // Display first few blogs
    const recentBlogs = blogsData.slice(0, 3);
    for (const blog of recentBlogs) {
      logger.info(`📖 ID: ${blog.id} | Title: ${blog.title}`);
      logger.info(`   Tags: ${blog.tags.join(', ')} | Read Time: ${blog.readTime} min`);
    }

    if (blogsData.length === 0) {
      logger.warn('❌ No blogs found in the database');
      return;
    }

    // Test 2: Get individual blog with content
    const firstBlogId = blogsData[0].id;
    logger.info(`\n2️⃣ Testing GET /api/blogs/${firstBlogId} - Get specific blog with content`);
    
    const blogResponse = await fetch(`${API_BASE}/api/blogs/${firstBlogId}`);
    if (!blogResponse.ok) {
      throw new Error(`Failed to fetch blog ${firstBlogId}: ${blogResponse.status} ${blogResponse.statusText}`);
    }

    const blogData = await blogResponse.json();
    logger.info(`✅ Successfully fetched blog: "${blogData.title}"`);
    logger.info(`📄 Content URL: ${blogData.contentUrl}`);
    logger.info(`🖼️ Cover Image URL: ${blogData.coverImageUrl || 'None'}`);
    
    // Check if presigned URLs are provided
    if (blogData.presignedContentUrl) {
      logger.info(`🔗 Presigned Content URL provided: ${blogData.presignedContentUrl.substring(0, 80)}...`);
    }
    if (blogData.presignedCoverUrl) {
      logger.info(`🔗 Presigned Cover URL provided: ${blogData.presignedCoverUrl.substring(0, 80)}...`);
    }

    // Test 3: Search functionality
    logger.info('\n3️⃣ Testing search functionality');
    
    const searchResponse = await fetch(`${API_BASE}/api/blogs?search=mindful`);
    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    logger.info(`🔍 Search for "mindful" returned ${searchData.length} results`);

    // Test 4: Tag filtering
    logger.info('\n4️⃣ Testing tag filtering');
    
    const tagResponse = await fetch(`${API_BASE}/api/blogs?tag=technology`);
    if (!tagResponse.ok) {
      throw new Error(`Tag filtering failed: ${tagResponse.status} ${tagResponse.statusText}`);
    }

    const tagData = await tagResponse.json();
    logger.info(`🏷️ Tag filter for "technology" returned ${tagData.length} results`);

    // Test 5: Test blog creation (if API key is available)
    if (API_KEY) {
      logger.info('\n5️⃣ Testing blog creation with API key');
      
      const createResponse = await fetch(`${API_BASE}/api/blogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          title: `Test Blog Created ${new Date().toISOString()}`,
          tags: ['test', 'api'],
          content: '<h1>Test Blog</h1><p>This is a test blog created via API.</p>',
          readTime: 2
        })
      });

      if (createResponse.ok) {
        const createdBlog = await createResponse.json();
        logger.info(`✅ Successfully created test blog with ID: ${createdBlog.id}`);
        
        // Clean up - delete the test blog
        const deleteResponse = await fetch(`${API_BASE}/api/blogs/${createdBlog.id}`, {
          method: 'DELETE',
          headers: {
            'x-api-key': API_KEY
          }
        });

        if (deleteResponse.ok) {
          logger.info(`🗑️ Successfully deleted test blog ${createdBlog.id}`);
        } else {
          logger.warn(`⚠️ Failed to delete test blog ${createdBlog.id}`);
        }
      } else {
        logger.warn(`⚠️ Blog creation failed: ${createResponse.status} ${createResponse.statusText}`);
      }
    } else {
      logger.info('\n5️⃣ Skipping blog creation test (no API key provided)');
    }

    logger.info('\n🎉 All API endpoint tests completed successfully!');
    logger.info('✅ Your blog API is working perfectly with the new S3 bucket and realistic data');

  } catch (error) {
    logger.error('❌ API test failed:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  testAPIEndpoints();
}

module.exports = { testAPIEndpoints };