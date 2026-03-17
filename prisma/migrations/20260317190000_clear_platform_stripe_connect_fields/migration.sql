UPDATE "Business"
SET
  "stripeAccountId" = NULL,
  "stripeChargesEnabled" = false,
  "stripePayoutsEnabled" = false,
  "stripeDetailsSubmitted" = false
WHERE COALESCE("usesPlatformStripe", false) = true;
