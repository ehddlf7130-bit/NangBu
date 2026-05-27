export const CATEGORIES = ['과일', '육류', '유제품'] as const;
export type Category = (typeof CATEGORIES)[number];
