export const ADULT_BELTS = [
  { value: 'Branca', label: 'Branca' },
  { value: 'Azul', label: 'Azul' },
  { value: 'Roxa', label: 'Roxa' },
  { value: 'Marrom', label: 'Marrom' },
  { value: 'Preta', label: 'Preta' },
];

export const KIDS_BELTS = [
  { value: 'Branca', label: 'Branca' },
  { value: 'Cinza-Branca', label: 'Cinza-Branca' },
  { value: 'Cinza', label: 'Cinza' },
  { value: 'Cinza-Preta', label: 'Cinza-Preta' },
  { value: 'Amarela-Branca', label: 'Amarela-Branca' },
  { value: 'Amarela', label: 'Amarela' },
  { value: 'Amarela-Preta', label: 'Amarela-Preta' },
  { value: 'Laranja-Branca', label: 'Laranja-Branca' },
  { value: 'Laranja', label: 'Laranja' },
  { value: 'Laranja-Preta', label: 'Laranja-Preta' },
  { value: 'Verde-Branca', label: 'Verde-Branca' },
  { value: 'Verde', label: 'Verde' },
  { value: 'Verde-Preta', label: 'Verde-Preta' },
];

export const ALL_BELTS = [
  ...ADULT_BELTS,
  ...KIDS_BELTS.filter((kidsBelt) => !ADULT_BELTS.some((adultBelt) => adultBelt.value === kidsBelt.value)),
];

export const isKidsCategory = (category: string) => category?.toUpperCase() === 'KIDS';

export const getBeltOptionsForCategory = (category: string) => (isKidsCategory(category) ? KIDS_BELTS : ADULT_BELTS);

export const normalizeBeltForStorage = (belt: string) => belt.toUpperCase();

export const toDisplayBelt = (belt: string) => {
  if (!belt) return 'Branca';

  const normalized = belt.toUpperCase();
  const knownBelt = ALL_BELTS.find((option) => normalizeBeltForStorage(option.value) === normalized);

  if (knownBelt) return knownBelt.label;

  return belt
    .toLowerCase()
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
};

export const getBeltRankForAccess = (belt: string) => {
  const normalized = toDisplayBelt(belt);
  const adultRank = ADULT_BELTS.findIndex((option) => option.value === normalized);

  return adultRank >= 0 ? adultRank : 0;
};
