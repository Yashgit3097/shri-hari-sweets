export const SWEETS_PRICES = {
  "Kesar Kaju Katri": {
    250: 207.5,
    500: 415
  },
  "Kaju Kasata": {
    250: 225,
    500: 450
  },
  "Kaju Mahesur": {
    250: 170,
    500: 340
  },
  "Kesar Dryfruit Ghari": {
    250: 175,
    500: 350
  }
};

export const SWEET_NAMES = Object.keys(SWEETS_PRICES);

export const WEIGHT_OPTIONS = [
  { value: 250, label: "250 gram" },
  { value: 500, label: "500 gram" }
];

export const getPredefinedPrice = (itemName, weight) => {
  if (SWEETS_PRICES[itemName] && SWEETS_PRICES[itemName][weight]) {
    return SWEETS_PRICES[itemName][weight];
  }
  // Alias for backward compatibility if "Kaju Katri" is passed
  if (itemName === "Kaju Katri" && SWEETS_PRICES["Kesar Kaju Katri"]) {
    return SWEETS_PRICES["Kesar Kaju Katri"][weight] || 0;
  }
  return 0;
};
