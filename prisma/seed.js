const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if BusinessNumber table has any records
  const existingCount = await prisma.businessNumber.count();
  
  if (existingCount > 0) {
    console.log(`📊 BusinessNumber table already has ${existingCount} record(s), skipping seed`);
    return;
  }

  console.log('📱 Seeding BusinessNumber table...');
  console.log('ℹ️ Business numbers should be added via the admin interface at /admin/numbers');
  console.log('⚠️ This seed script no longer uses environment variables. All business numbers must be configured via the admin interface.');
  console.log('⚠️ No business numbers found in database.');
  console.log('📝 Please add business numbers via the admin interface at /admin/numbers');
  console.log('   Each business number requires:');
  console.log('   - numberId (WhatsApp phone number ID)');
  console.log('   - wabaId (WhatsApp Business Account ID)');
  console.log('   - phoneNumber (display phone number)');
  console.log('   - label (display name)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
