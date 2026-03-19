ALTER TABLE "User"
ADD COLUMN "acceptedPrivacyAt" TIMESTAMP(3),
ADD COLUMN "acceptedTermsAt" TIMESTAMP(3),
ADD COLUMN "acceptedLegalVersion" TEXT;
