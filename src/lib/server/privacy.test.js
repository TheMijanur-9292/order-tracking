import { describe, it, expect } from 'vitest';
import { maskPhone, areaOnly } from './privacy.js';

describe('maskPhone', () => {
  it('keeps only the first two digits', () => {
    expect(maskPhone('+91-9876543210')).toBe('+91-98xxxxxxxx');
    expect(maskPhone('9876543210')).toBe('+91-98xxxxxxxx');
    expect(maskPhone('+91 98765 43210')).toBe('+91-98xxxxxxxx');
  });

  it('returns empty for missing numbers', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone(null)).toBe('');
  });
});

describe('areaOnly', () => {
  it('drops house/room details, state and country', () => {
    expect(areaOnly('Flat 4, 12/3 Some Rd, Garfa, Jadavpur, Kolkata, West Bengal, India')).toBe('Garfa, Jadavpur, Kolkata');
    expect(areaOnly('Jadavpur University Main Hostel,B-Block,Room No-20, Jadavpur University, Kolkata, West Bengal')).not.toMatch(/\d/);
  });

  it('returns empty for missing addresses', () => {
    expect(areaOnly('')).toBe('');
  });
});
