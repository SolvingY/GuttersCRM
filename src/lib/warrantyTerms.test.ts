import { describe, it, expect } from "vitest";
import { protectionWarrantyYears, protectionWarrantyLabel } from "./warrantyTerms";

// Regression coverage for the single source of truth introduced in the lead
// lifecycle audit (Step 6). The warranty email and the signed contract must
// agree on protection warranty length; these cases lock in that mapping.
describe("protectionWarrantyYears", () => {
  it("returns null for no product", () => {
    expect(protectionWarrantyYears(undefined)).toBeNull();
    expect(protectionWarrantyYears(null)).toBeNull();
    expect(protectionWarrantyYears("")).toBeNull();
  });

  it("returns null for cheap mesh (no manufacturer warranty)", () => {
    expect(protectionWarrantyYears("Cheap Mesh")).toBeNull();
    expect(protectionWarrantyYears("cheap mesh add-on")).toBeNull();
  });

  it("returns 10 for Gutter RX products", () => {
    expect(protectionWarrantyYears("Gutter RX Collector")).toBe(10);
    expect(protectionWarrantyYears("gutter rx")).toBe(10);
  });

  it("returns 45 for any other named product (matches contract default)", () => {
    expect(protectionWarrantyYears("Hydro Flow")).toBe(45);
    expect(protectionWarrantyYears("Pro Flo")).toBe(45);
    expect(protectionWarrantyYears("Leaf Blaster Pro")).toBe(45);
    expect(protectionWarrantyYears("Standard")).toBe(45);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(protectionWarrantyYears("  GUTTER RX  ")).toBe(10);
    expect(protectionWarrantyYears("  CHEAP MESH ")).toBeNull();
  });
});

describe("protectionWarrantyLabel", () => {
  it("formats a label when a warranty applies", () => {
    expect(protectionWarrantyLabel("Hydro Flow")).toBe("45-Year Manufacturer Warranty on Gutter Protection");
    expect(protectionWarrantyLabel("Gutter RX")).toBe("10-Year Manufacturer Warranty on Gutter Protection");
  });

  it("returns null when no warranty applies", () => {
    expect(protectionWarrantyLabel("Cheap Mesh")).toBeNull();
    expect(protectionWarrantyLabel("")).toBeNull();
  });
});
