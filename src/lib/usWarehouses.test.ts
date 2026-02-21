import { describe, expect, it } from "vitest";
import {
  getWarehouseById,
  getWarehouseRegionById,
  tiktokUsWarehouses,
} from "./usWarehouses";

describe("tiktokUsWarehouses", () => {
  it("contains all provided 17 warehouses", () => {
    expect(tiktokUsWarehouses).toHaveLength(17);
  });
});

describe("getWarehouseById", () => {
  it("returns full warehouse information", () => {
    const warehouse = getWarehouseById("WPOCA");
    expect(warehouse?.name).toContain("Rialto");
    expect(warehouse?.zip).toBe("92376");
  });
});

describe("getWarehouseRegionById", () => {
  it("resolves west/central/east regions", () => {
    expect(getWarehouseRegionById("WPOCA")).toBe("west");
    expect(getWarehouseRegionById("VEYIL")).toBe("central");
    expect(getWarehouseRegionById("JDLNJ")).toBe("east");
  });
});
