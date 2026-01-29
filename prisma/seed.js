const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'admin@billinglead.com', password: 'Admin123!', role: 'ADMIN' },
    { email: 'user1@billinglead.com', password: 'User123!', role: 'USER' },
    { email: 'user2@billinglead.com', password: 'User123!', role: 'USER' },
    { email: 'user3@billinglead.com', password: 'User123!', role: 'USER' },
    { email: 'user4@billinglead.com', password: 'User123!', role: 'USER' },
    { email: 'user5@billinglead.com', password: 'User123!', role: 'USER' },
  ];

  for (const u of users) {
    const passwordHash = await hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: { passwordHash, role: u.role },
      create: {
        email: u.email.toLowerCase(),
        passwordHash,
        role: u.role,
      },
    });
    console.log(`Upserted ${u.role}: ${u.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
