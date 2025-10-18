import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.car.deleteMany();
  await prisma.car.createMany({
    data: [
      { vin: '1HGCM82633A004352', make: 'Toyota', model: 'Camry', year: 2019, priceCents: 1650000, mileage: 42000, color: 'Silver', condition: 'used' },
      { vin: '2HGES16555H123456', make: 'Honda', model: 'Civic', year: 2018, priceCents: 1490000, mileage: 51000, color: 'Blue', condition: 'used' },
      { vin: '3VWFE21C04M000001', make: 'Volkswagen', model: 'Jetta', year: 2020, priceCents: 1725000, mileage: 36000, color: 'White', condition: 'used' }
    ]
  });
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
