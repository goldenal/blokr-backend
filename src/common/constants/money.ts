/** Money is always stored in kobo (1 NGN = 100 kobo) to avoid floating point drift. */
export const nairaToKobo = (naira: number): number => Math.round(naira * 100);

export const koboToNaira = (kobo: number): number => kobo / 100;
