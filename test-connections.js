/**
 * Connection Test Script
 * Tests PostgreSQL and S3 connections
 */

require('dotenv').config();
const { S3Client, ListBucketsCommand, HeadBucketCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const prisma = require('./src/prismaClient');

async function testPostgreSQL() {
  console.log('\n📊 Testing PostgreSQL Connection...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ PostgreSQL: Connected successfully');
    
    // Count blogs
    const count = await prisma.blog.count();
    console.log(`✅ Blogs table: Accessible (${count} blogs found)`);
    
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL Error:', error.message);
    return false;
  }
}

async function testS3() {
  console.log('\n☁️  Testing AWS S3 Connection...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Bucket:', process.env.S3_BUCKET);
  console.log('Region:', process.env.AWS_REGION);
  
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // Test 1: List all buckets
    console.log('\n1️⃣  Testing bucket list access...');
    const listCommand = new ListBucketsCommand({});
    const listResponse = await s3Client.send(listCommand);
    const bucketNames = listResponse.Buckets.map(b => b.Name);
    console.log('✅ S3 Credentials: Valid');
    console.log('Available buckets:', bucketNames.join(', '));
    
    // Test 2: Check if our bucket exists
    console.log('\n2️⃣  Checking bucket:', process.env.S3_BUCKET);
    const bucketExists = bucketNames.includes(process.env.S3_BUCKET);
    
    if (bucketExists) {
      console.log('✅ Bucket found:', process.env.S3_BUCKET);
      
      // Test 3: Try uploading a test file
      console.log('\n3️⃣  Testing file upload...');
      const testKey = 'test/connection-test.txt';
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: testKey,
        Body: Buffer.from('Connection test - ' + new Date().toISOString()),
        ContentType: 'text/plain',
      });
      
      await s3Client.send(uploadCommand);
      console.log('✅ File upload: Success');
      console.log('Test file created at:', testKey);
      
      return true;
    } else {
      console.log('❌ Bucket not found:', process.env.S3_BUCKET);
      console.log('\n💡 Did you mean one of these?');
      bucketNames.forEach(name => console.log('   -', name));
      return false;
    }
  } catch (error) {
    console.log('❌ S3 Error:', error.name || error.Code);
    console.log('Message:', error.message);
    
    if (error.name === 'InvalidAccessKeyId') {
      console.log('\n💡 Your AWS Access Key ID is invalid');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.log('\n💡 Your AWS Secret Access Key is incorrect');
    } else if (error.name === 'AccessDenied') {
      console.log('\n💡 Your credentials don\'t have permission to access this bucket');
    }
    
    return false;
  }
}

async function runTests() {
  console.log('\n🔍 BeyondMoksha Backend Connection Tests');
  console.log('════════════════════════════════════════════\n');
  
  const pgResult = await testPostgreSQL();
  const s3Result = await testS3();
  
  console.log('\n📋 Test Results Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`PostgreSQL: ${pgResult ? '✅ READY' : '❌ FAILED'}`);
  console.log(`AWS S3:     ${s3Result ? '✅ READY' : '❌ FAILED'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (pgResult && s3Result) {
    console.log('🎉 All systems operational! Your backend is ready to upload data.\n');
  } else {
    console.log('⚠️  Some systems need attention. See errors above.\n');
  }
  
  await prisma.$disconnect();
  process.exit(pgResult && s3Result ? 0 : 1);
}

runTests();
