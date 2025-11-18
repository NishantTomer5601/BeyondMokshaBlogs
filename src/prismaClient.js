/**
 * Prisma Client Singleton
 * Manages database connection through Prisma ORM
 */

const { PrismaClient } = require('@prisma/client');

// Prisma Client configuration
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'minimal',
  });
};

// Global prisma client to prevent multiple instances in development
const globalForPrisma = global;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Export the prisma instance
module.exports = prisma;

// Store on global object in development to prevent hot reload issues
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
