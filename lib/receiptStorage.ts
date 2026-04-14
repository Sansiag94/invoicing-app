const PUBLIC_OBJECT_MARKER = "/storage/v1/object/public/";

export type ReceiptStorageLocation = {
  bucket: string;
  path: string;
};

export function buildStoredReceiptPath(businessId: string, expenseId: string, filename: string): string {
  return `${businessId}/${expenseId}/${filename}`;
}

export function resolveReceiptStorageLocation(
  receiptUrl: string | null | undefined,
  defaultBucket: string
): ReceiptStorageLocation | null {
  const value = receiptUrl?.trim();
  if (!value) {
    return null;
  }

  if (!/^https?:\/\//i.test(value)) {
    return {
      bucket: defaultBucket,
      path: value.replace(/^\/+/, ""),
    };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const markerIndex = url.pathname.indexOf(PUBLIC_OBJECT_MARKER);
  if (markerIndex < 0) {
    return null;
  }

  const objectPath = url.pathname.slice(markerIndex + PUBLIC_OBJECT_MARKER.length);
  const separatorIndex = objectPath.indexOf("/");
  if (separatorIndex < 1 || separatorIndex === objectPath.length - 1) {
    return null;
  }

  return {
    bucket: decodeURIComponent(objectPath.slice(0, separatorIndex)),
    path: decodeURIComponent(objectPath.slice(separatorIndex + 1)),
  };
}
