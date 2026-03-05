ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inactivityTimeoutMinutes" INTEGER;

CREATE TABLE IF NOT EXISTS "UserCard" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "scanSlug" TEXT NOT NULL,
  "status" "CardStatus" NOT NULL DEFAULT 'ACTIVE',
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "lockedAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserCard_token_key" ON "UserCard"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "UserCard_scanSlug_key" ON "UserCard"("scanSlug");
CREATE INDEX IF NOT EXISTS "UserCard_userId_idx" ON "UserCard"("userId");
CREATE INDEX IF NOT EXISTS "UserCard_scanSlug_idx" ON "UserCard"("scanSlug");
CREATE INDEX IF NOT EXISTS "UserCard_token_idx" ON "UserCard"("token");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserCard_userId_fkey'
  ) THEN
    ALTER TABLE "UserCard" ADD CONSTRAINT "UserCard_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
