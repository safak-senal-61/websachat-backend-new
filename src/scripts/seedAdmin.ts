import 'dotenv/config';
import { prisma } from '../config/database';
import { Role } from '../generated/prisma';

async function main(): Promise<void> {
  // Email, öncelikle ENV’den; yoksa komut satırı argümanından
  const envEmail = String(process.env.ADMIN_SEED_EMAIL ?? '').trim().toLowerCase();
  const argEmail = String(process.argv[2] ?? '').trim().toLowerCase();
  const email = envEmail || argEmail;

  if (!email) {
    console.error('Please provide an email via ADMIN_SEED_EMAIL env or as CLI argument.');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User with email ${email} not found. Please register the user first.`);
    process.exit(1);
  }

  if (user.role === Role.ADMIN) {
    console.log(`User ${email} is already an ADMIN.`);
    process.exit(0);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: Role.ADMIN },
  });

  console.log(`User ${email} has been promoted to ADMIN.`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });