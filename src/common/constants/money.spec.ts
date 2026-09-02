import { koboToNaira, nairaToKobo } from './money';

describe('money', () => {
  it('converts naira to kobo', () => {
    expect(nairaToKobo(15000)).toBe(1500000);
    expect(nairaToKobo(0)).toBe(0);
  });

  it('rounds fractional naira to the nearest kobo', () => {
    expect(nairaToKobo(15000.005)).toBe(1500001);
  });

  it('converts kobo back to naira', () => {
    expect(koboToNaira(1500000)).toBe(15000);
    expect(koboToNaira(0)).toBe(0);
  });

  it('round-trips nairaToKobo/koboToNaira for whole-naira amounts', () => {
    for (const naira of [0, 15000, 35000, 60000]) {
      expect(koboToNaira(nairaToKobo(naira))).toBe(naira);
    }
  });
});
