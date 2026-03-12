export type StructuredAddressInput = {
  address?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
};

function normalize(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildAddressString(input: Pick<StructuredAddressInput, "street" | "postalCode" | "city">): string {
  const street = normalize(input.street);
  const postalCode = normalize(input.postalCode);
  const city = normalize(input.city);

  return [street, [postalCode, city].filter(Boolean).join(" ")].filter(Boolean).join("\n");
}

export function withStructuredAddress<T extends StructuredAddressInput>(input: T) {
  const street = normalize(input.street);
  const postalCode = normalize(input.postalCode);
  const city = normalize(input.city);
  const address = normalize(input.address) ?? (buildAddressString({ street, postalCode, city }) || null);

  return {
    ...input,
    street,
    postalCode,
    city,
    address,
  };
}
