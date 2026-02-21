export type WarehouseRegion = "west" | "central" | "east";

export type WarehouseType = "FC仓" | "Hub仓";

export type UsWarehouse = {
  region: WarehouseRegion;
  sequence: number;
  name: string;
  type: WarehouseType;
  id: string;
  code: string;
  city: string;
  state: string;
  zip: string;
  address: string;
};

export const warehouseRegionLabels: Record<WarehouseRegion, string> = {
  west: "美西",
  central: "美中",
  east: "美东",
};

export const tiktokUsWarehouses: UsWarehouse[] = [
  {
    region: "west",
    sequence: 1,
    name: "Tiktok_Rialto(CA_2)_FC",
    type: "FC仓",
    id: "WPOCA",
    code: "FC11_ONT5",
    city: "Rialto",
    state: "CA",
    zip: "92376",
    address: "1979 Renaissance Pkwy",
  },
  {
    region: "west",
    sequence: 2,
    name: "TikTok_Fontana(CA_1)_FC",
    type: "FC仓",
    id: "CAICA",
    code: "FC07_ONT3",
    city: "Fontana",
    state: "CA",
    zip: "92337",
    address: "10886 Citrus Ave",
  },
  {
    region: "west",
    sequence: 3,
    name: "TikTok_Fontana(CA_2)_FC",
    type: "FC仓",
    id: "ARMFC",
    code: "FC08_ONT4",
    city: "Fontana",
    state: "CA",
    zip: "92337",
    address: "11618 Mulberry Avenue",
  },
  {
    region: "west",
    sequence: 4,
    name: "TikTok_Ontario(CA)_Hub",
    type: "Hub仓",
    id: "TLHUB",
    code: "XD01_ONT1",
    city: "Eastvale",
    state: "CA",
    zip: "91752",
    address: "4560 Hamner Ave",
  },
  {
    region: "west",
    sequence: 5,
    name: "TikTok_Chino(CA)_Hub",
    type: "Hub仓",
    id: "TWHUB",
    code: "XD03_ONT6",
    city: "Chino",
    state: "CA",
    zip: "91708",
    address: "15820 Euclid Ave, Unit B",
  },
  {
    region: "west",
    sequence: 6,
    name: "Tiktok_Rialto(CA)_FC",
    type: "FC仓",
    id: "GCWCA",
    code: "FC01_ONT2",
    city: "Rialto",
    state: "CA",
    zip: "92376",
    address: "1420 Tamarind Ave",
  },
  {
    region: "central",
    sequence: 7,
    name: "TikTok_Carol(IL)_FC",
    type: "FC仓",
    id: "VEYIL",
    code: "FC02_ORD1",
    city: "Carol",
    state: "IL",
    zip: "60188",
    address: "515 Kehoe Blvd",
  },
  {
    region: "central",
    sequence: 8,
    name: "TikTok_Joliet(IL)_FC",
    type: "FC仓",
    id: "WPOIL",
    code: "FC10_ORD2",
    city: "Joliet",
    state: "IL",
    zip: "60436",
    address: "100 W. Compass Boulevard",
  },
  {
    region: "central",
    sequence: 9,
    name: "TikTok_Stafford(TX)_FC",
    type: "FC仓",
    id: "JDLTX",
    code: "FC12_HOU3",
    city: "Stafford",
    state: "TX",
    zip: "77477",
    address: "13650 Pike Rd, Bldg 1",
  },
  {
    region: "central",
    sequence: 10,
    name: "TikTok_Pasadena(TX)_FC",
    type: "FC仓",
    id: "ARMTX",
    code: "FC06_HOU2",
    city: "Pasadena",
    state: "TX",
    zip: "77503",
    address: "619 E Sam Houston Pkwy S Ste 800",
  },
  {
    region: "central",
    sequence: 11,
    name: "TikTok_Houston(TX)_FC",
    type: "FC仓",
    id: "CAITX",
    code: "FC05_HOU1",
    city: "Houston",
    state: "TX",
    zip: "77085",
    address: "5880 W Fuqua, Suite #200",
  },
  {
    region: "east",
    sequence: 12,
    name: "TikTok_Middlesex(NJ)_FC",
    type: "FC仓",
    id: "JDLNJ",
    code: "FC04_EWR2",
    city: "Middlesex",
    state: "NJ",
    zip: "08846",
    address: "245 Mountain Ave",
  },
  {
    region: "east",
    sequence: 13,
    name: "TikTok_Buford(GA_2)_FC",
    type: "FC仓",
    id: "YQNGA",
    code: "FC09_ATL2",
    city: "Buford",
    state: "GA",
    zip: "30518",
    address: "2105 Buford Highway",
  },
  {
    region: "east",
    sequence: 14,
    name: "TikTok_Buford(GA)_FC",
    type: "FC仓",
    id: "JDLGA",
    code: "FC03_ATL1",
    city: "Buford",
    state: "GA",
    zip: "30518",
    address: "4375 S Lee St",
  },
  {
    region: "east",
    sequence: 15,
    name: "TikTok_Oldbridge(NJ)_FC",
    type: "FC仓",
    id: "NJOLDB",
    code: "FC13_EWR3",
    city: "Old Bridge",
    state: "NJ",
    zip: "08857",
    address: "400 Fairway Ln",
  },
  {
    region: "east",
    sequence: 16,
    name: "TikTok_Middlesex(NJ)_Hub",
    type: "Hub仓",
    id: "JDHUB",
    code: "XD02_EWR1",
    city: "Middlesex",
    state: "NJ",
    zip: "08846",
    address: "245 Mountain Ave",
  },
  {
    region: "east",
    sequence: 17,
    name: "TikTok_PortReading(NJ)_FC",
    type: "FC仓",
    id: "NJYQN",
    code: "FC14_EWR4",
    city: "Port Reading",
    state: "NJ",
    zip: "07064",
    address: "1001 W Middlesex Ave",
  },
];

export const getWarehouseById = (warehouseId: string): UsWarehouse | undefined => {
  return tiktokUsWarehouses.find((warehouse) => warehouse.id === warehouseId);
};

export const getWarehouseRegionById = (warehouseId: string): WarehouseRegion | null => {
  return getWarehouseById(warehouseId)?.region ?? null;
};
