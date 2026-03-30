import "dotenv/config"

const config = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts'
  }
}

export default config
