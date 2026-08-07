export const SWEETS_PRICES = {
  "Kaju Katri": {
    250: 220,
    500: 440,
    1000: 850
  },
  "Kaju Kasata": {
    250: 250,
    500: 500,
    1000: 950
  },
  "Kaju Mahesur": {
    250: 280,
    500: 560,
    1000: 1100
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
  return 0;
};
