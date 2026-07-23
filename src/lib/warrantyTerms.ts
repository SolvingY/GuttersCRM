// Single source of truth for the gutter-protection manufacturer warranty length.
//
// This MUST match what the signed contract states (the scope-of-work lines in
// GutterContract). Previously the contract treated everything except
// "Cheap Mesh" / "Gutter RX" as a 45-year product, while the warranty email
// only recognized "hydro flow" / "pro flo" as 45-year and emitted NO warranty
// line for anything else — so a customer whose contract promised a 45-year
// warranty could receive a warranty email with no protection warranty at all.
//
// The contract wording is authoritative (it is what the customer signed), so
// the email must never under-promise relative to it. Both the contract and the
// warranty email now derive their protection warranty from this function.

export function protectionWarrantyYears(product?: string | null): number | null {
  const p = (product || "").toLowerCase().trim();
  if (!p) return null;
  if (p.includes("cheap mesh")) return null; // basic mesh carries no manufacturer warranty
  if (p.includes("gutter rx")) return 10;
  return 45;
}

export function protectionWarrantyLabel(product?: string | null): string | null {
  const years = protectionWarrantyYears(product);
  return years ? `${years}-Year Manufacturer Warranty on Gutter Protection` : null;
}
