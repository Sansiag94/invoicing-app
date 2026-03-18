import prisma from "@/lib/prisma";

export const APP_NAME = "S-Invoices";
export const APP_SHORT_NAME = "S-Invoices";
export const APP_BRAND_ICON_VERSION = "20260318-black-bg";

function normalizeLogoUrl(value: string | null | undefined): string | null {
  const normalized = value?.trim() || "";
  return normalized.length > 0 ? normalized : null;
}

export async function getAppBrandLogoUrl(): Promise<string | null> {
  try {
    const platformBusiness = await prisma.business.findFirst({
      where: {
        usesPlatformStripe: true,
        logoUrl: {
          not: null,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        logoUrl: true,
      },
    });

    const platformLogoUrl = normalizeLogoUrl(platformBusiness?.logoUrl);
    if (platformLogoUrl) {
      return platformLogoUrl;
    }

    const fallbackBusiness = await prisma.business.findFirst({
      where: {
        logoUrl: {
          not: null,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        logoUrl: true,
      },
    });

    return normalizeLogoUrl(fallbackBusiness?.logoUrl);
  } catch (error) {
    console.error("[app-brand] Failed to resolve app logo", error);
    return null;
  }
}
