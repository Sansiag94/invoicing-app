ALTER TABLE "Business" DROP CONSTRAINT "Business_userId_fkey";

ALTER TABLE "Business"
ADD CONSTRAINT "Business_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("uuid")
ON DELETE CASCADE
ON UPDATE CASCADE;
