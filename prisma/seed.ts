import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const travel = await prisma.album.upsert({
        where: { id: 'seed-travel' },
        update: {},
        create: {
            id: 'seed-travel',
            name: 'Travel',
            slug: 'travel',
        },
    });

    await prisma.album.upsert({
        where: { id: 'seed-personal' },
        update: {},
        create: {
            id: 'seed-personal',
            name: 'Personal',
            slug: 'personal',
        },
    });

    console.log({ travel });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
