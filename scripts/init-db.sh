#!/bin/sh
# Run Prisma migrations and seed admin user on startup
echo "[Init] Running database migrations..."
npx prisma db push --accept-data-loss
echo "[Init] Seeding admin user..."
npx tsx prisma/seed.ts 2>/dev/null || true
echo "[Init] Done."
