import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local, so the Prisma CLI is pointed at the same file
// rather than keeping a second copy of DATABASE_URL in .env.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
