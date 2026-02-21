import { describe, expect, it } from "vitest";
import {
  calculateFirstLegByChannel,
  defaultAirExpressRateTable,
  defaultFlatRatePerKgByChannel,
  detectAirExpressZoneByWarehouseId,
  type AirExpressRateTable,
} from "./firstLegPricing";

describe("detectAirExpressZoneByWarehouseId", () => {
  it("maps warehouse id to west/central/east zones", () => {
    expect(detectAirExpressZoneByWarehouseId("WPOCA")).toBe("west");
    expect(detectAirExpressZoneByWarehouseId("VEYIL")).toBe("central");
    expect(detectAirExpressZoneByWarehouseId("JDLNJ")).toBe("east");
  });

  it("returns null for unknown warehouse id", () => {
    expect(detectAirExpressZoneByWarehouseId("")).toBeNull();
    expect(detectAirExpressZoneByWarehouseId("UNKNOWN")).toBeNull();
  });
});

describe("calculateFirstLegByChannel", () => {
  it("returns zero when standard sea warehouse is missing", () => {
    const result = calculateFirstLegByChannel({
      channel: "fbt_us_standard_sea_truck",
      chargeableWeightKg: 18.2,
      originRegion: "east_china",
      flatRatePerKgByChannel: {
        ...defaultFlatRatePerKgByChannel,
        fbt_us_standard_sea_truck: 12.5,
      },
      airExpressRateTable: defaultAirExpressRateTable,
      destinationWarehouseId: "",
    });

    expect(result.ratePerKg).toBe(0);
    expect(result.firstLegCost).toBe(0);
    expect(result.details).toContain("缺少有效海外仓");
  });

  it("uses warehouse-zone + tier pricing for fbt air express with 12kg minimum", () => {
    const result = calculateFirstLegByChannel({
      channel: "fbt_air_express",
      chargeableWeightKg: 8,
      originRegion: "east_china",
      flatRatePerKgByChannel: defaultFlatRatePerKgByChannel,
      airExpressRateTable: defaultAirExpressRateTable,
      destinationWarehouseId: "WPOCA",
    });

    expect(result.zone).toBe("west");
    expect(result.tier).toBe("12_20");
    expect(result.ratePerKg).toBe(51);
    expect(result.billableWeightKg).toBe(12);
    expect(result.firstLegCost).toBe(612);
    expect(result.details).toContain("仓库分区+重量梯度");
  });

  it("returns zero cost with error details when warehouse is missing", () => {
    const result = calculateFirstLegByChannel({
      channel: "fbt_air_express",
      chargeableWeightKg: 18,
      originRegion: "east_china",
      flatRatePerKgByChannel: defaultFlatRatePerKgByChannel,
      airExpressRateTable: defaultAirExpressRateTable,
      destinationWarehouseId: "",
    });

    expect(result.firstLegCost).toBe(0);
    expect(result.details).toContain("缺少有效海外仓");
  });

  it("uses 101kg+ tier when billable weight is high", () => {
    const table: AirExpressRateTable = {
      west: { tier12To20: 10, tier21To100: 9, tier101Plus: 8 },
      central: { tier12To20: 11, tier21To100: 10, tier101Plus: 9 },
      east: { tier12To20: 12, tier21To100: 11, tier101Plus: 10 },
    };

    const result = calculateFirstLegByChannel({
      channel: "fbt_air_express",
      chargeableWeightKg: 150,
      originRegion: "east_china",
      flatRatePerKgByChannel: defaultFlatRatePerKgByChannel,
      airExpressRateTable: table,
      destinationWarehouseId: "JDLGA",
    });

    expect(result.tier).toBe("101_plus");
    expect(result.ratePerKg).toBe(10);
    expect(result.firstLegCost).toBe(1500);
  });

  it("uses express sea table by warehouse code + origin region", () => {
    const result = calculateFirstLegByChannel({
      channel: "fbt_us_express_sea_truck",
      chargeableWeightKg: 600,
      originRegion: "south_china",
      flatRatePerKgByChannel: defaultFlatRatePerKgByChannel,
      airExpressRateTable: defaultAirExpressRateTable,
      destinationWarehouseId: "WPOCA",
    });

    expect(result.tier).toBe("500_plus");
    expect(result.ratePerKg).toBe(10);
    expect(result.firstLegCost).toBe(6000);
    expect(result.details).toContain("特快海卡仓库报价");
  });

  it("returns zero cost when express sea has no 12kg+ quote for selected warehouse", () => {
    const result = calculateFirstLegByChannel({
      channel: "fbt_us_express_sea_truck",
      chargeableWeightKg: 20,
      originRegion: "east_china",
      flatRatePerKgByChannel: defaultFlatRatePerKgByChannel,
      airExpressRateTable: defaultAirExpressRateTable,
      destinationWarehouseId: "VEYIL",
    });

    expect(result.firstLegCost).toBe(0);
    expect(result.details).toContain("无可用报价");
  });

  it("uses 51kg+ tier for central warehouses in express sea", () => {
    const result = calculateFirstLegByChannel({
      channel: "fbt_us_express_sea_truck",
      chargeableWeightKg: 80,
      originRegion: "south_china",
      flatRatePerKgByChannel: defaultFlatRatePerKgByChannel,
      airExpressRateTable: defaultAirExpressRateTable,
      destinationWarehouseId: "VEYIL",
    });

    expect(result.tier).toBe("51_plus");
    expect(result.ratePerKg).toBe(13.1);
    expect(result.firstLegCost).toBe(1048);
  });

  it("uses standard sea table by warehouse code + origin region", () => {
    const result = calculateFirstLegByChannel({
      channel: "fbt_us_standard_sea_truck",
      chargeableWeightKg: 600,
      originRegion: "south_china",
      flatRatePerKgByChannel: defaultFlatRatePerKgByChannel,
      airExpressRateTable: defaultAirExpressRateTable,
      destinationWarehouseId: "WPOCA",
    });

    expect(result.tier).toBe("500_plus");
    expect(result.ratePerKg).toBe(6.6);
    expect(result.firstLegCost).toBe(3960);
    expect(result.details).toContain("标快海卡仓库报价");
  });

  it("returns zero cost when standard sea has no 12kg+ quote for selected warehouse", () => {
    const result = calculateFirstLegByChannel({
      channel: "fbt_us_standard_sea_truck",
      chargeableWeightKg: 20,
      originRegion: "east_china",
      flatRatePerKgByChannel: defaultFlatRatePerKgByChannel,
      airExpressRateTable: defaultAirExpressRateTable,
      destinationWarehouseId: "VEYIL",
    });

    expect(result.firstLegCost).toBe(0);
    expect(result.details).toContain("无可用报价");
  });

  it("uses economy sea table by warehouse code + origin region", () => {
    const result = calculateFirstLegByChannel({
      channel: "fbt_us_economy_sea_truck",
      chargeableWeightKg: 600,
      originRegion: "south_china",
      flatRatePerKgByChannel: defaultFlatRatePerKgByChannel,
      airExpressRateTable: defaultAirExpressRateTable,
      destinationWarehouseId: "WPOCA",
    });

    expect(result.tier).toBe("500_plus");
    expect(result.ratePerKg).toBe(4.2);
    expect(result.firstLegCost).toBe(2520);
    expect(result.details).toContain("经济海卡仓库报价");
  });

  it("returns zero cost when economy sea has no 12kg+ quote for selected warehouse", () => {
    const result = calculateFirstLegByChannel({
      channel: "fbt_us_economy_sea_truck",
      chargeableWeightKg: 20,
      originRegion: "east_china",
      flatRatePerKgByChannel: defaultFlatRatePerKgByChannel,
      airExpressRateTable: defaultAirExpressRateTable,
      destinationWarehouseId: "VEYIL",
    });

    expect(result.firstLegCost).toBe(0);
    expect(result.details).toContain("无可用报价");
  });
});
