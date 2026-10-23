import { describe, it, expect } from 'vitest';
import { buildSuggestions, getPreviousMonth } from './suggestions.js';

const rest = (id, name) => ({ id, name, zone_id: 1, distance: 'C. 2-3', platform: 'Both' });

const order = (restaurant_id, month_year, time_slot, receiver_id, receiver_name, extra = {}) => ({
  restaurant_id,
  month_year,
  time_slot,
  receiver_id,
  receiver_name,
  receiver_phone: '+91-9000000000',
  receiver_address: 'Jadavpur, Kolkata',
  status: 'Ordered',
  ordered_at: `${month_year}-15T06:00:00.000Z`,
  zone_name: 'KOL_Jadavpur',
  ...extra
});

const restaurants = [rest(1, 'R1'), rest(2, 'R2'), rest(3, 'R3')];
const history = [
  order(1, '2026-09', 'Lunch', 1, 'Rec A'),
  order(2, '2026-09', 'Dinner', 2, 'Rec B'),
  order(3, '2026-09', 'Lunch', 3, 'Rec C', { status: 'Cancelled' }),
  order(2, '2026-10', 'Dinner', 2, 'Rec B')
];
const currentOrders = [{ restaurant_id: 2, month_year: '2026-10', status: 'Ordered', receiver_name: 'Rec B' }];

const run = (opts) => buildSuggestions({ restaurants, history, currentOrders, targetMonth: '2026-10', ...opts });
const byName = (list) => Object.fromEntries(list.map(s => [s.name, s]));

describe('getPreviousMonth', () => {
  it('handles normal months and January', () => {
    expect(getPreviousMonth('2026-10')).toBe('2026-09');
    expect(getPreviousMonth('2026-01')).toBe('2025-12');
  });

  it('returns empty string for bad input', () => {
    expect(getPreviousMonth('')).toBe('');
    expect(getPreviousMonth('garbage')).toBe('');
  });
});

describe('buildSuggestions', () => {
  it('suggests repeating last month\'s order in the same slot, with last month\'s receiver', () => {
    const { suggestions } = run({ timeSlot: 'Lunch' });
    const s = byName(suggestions);
    expect(s.R1.is_ordered_prev_month).toBe(true);
    expect(s.R1.tag_type).toBe('gold');
    expect(s.R1.latest_history.receiver_name).toBe('Rec A');
    expect(s.R1.latest_history.receiver_id).toBe(1);
  });

  it('shows restaurants without a last-month order in that slot as Fresh', () => {
    const s = byName(run({ timeSlot: 'Lunch' }).suggestions);
    expect(s.R3.tag_type).toBe('blue');
    expect(s.R3.is_ordered_prev_month).toBe(false);

    // R1 was ordered last month, but for Lunch, so it is Fresh for Dinner
    const dinner = byName(run({ timeSlot: 'Dinner' }).suggestions);
    expect(dinner.R1.tag_type).toBe('blue');
  });

  it('ignores cancelled orders', () => {
    const { suggestions, topReceivers } = run({ timeSlot: 'Lunch' });
    expect(byName(suggestions).R3.history_count).toBe(0);
    expect(topReceivers.map(r => r.name)).not.toContain('Rec C');
  });

  it('marks restaurants already ordered this month as done and puts them last', () => {
    const { suggestions } = run({ timeSlot: 'Lunch' });
    expect(suggestions.map(s => s.name)).toEqual(['R1', 'R3', 'R2']);
    expect(suggestions[2].tag_type).toBe('ordered');
  });

  it('filters by strategy', () => {
    expect(run({ timeSlot: 'Lunch', strategy: 'last_month' }).suggestions.map(s => s.name)).toEqual(['R1']);
    expect(run({ timeSlot: 'Lunch', strategy: 'fresh' }).suggestions.map(s => s.name)).toEqual(['R3']);
    expect(run({ timeSlot: 'Lunch', strategy: 'pending_target' }).suggestions.map(s => s.name)).toEqual(['R1', 'R3']);
  });

  it('counts top receivers from last month in the selected slot', () => {
    expect(run({ timeSlot: 'Lunch' }).topReceivers.map(r => r.name)).toEqual(['Rec A']);
    expect(run({ timeSlot: 'Dinner' }).topReceivers.map(r => r.name)).toEqual(['Rec B']);
  });

  it('treats a missing time_slot as Lunch', () => {
    const { suggestions } = buildSuggestions({
      restaurants: [rest(9, 'R9')],
      history: [order(9, '2026-09', null, 4, 'Rec D')],
      currentOrders: [],
      targetMonth: '2026-10',
      timeSlot: 'Lunch'
    });
    expect(suggestions[0].is_ordered_prev_month).toBe(true);
  });

  it('uses the latest last-month order when there are several', () => {
    const { suggestions } = buildSuggestions({
      restaurants: [rest(9, 'R9')],
      history: [
        order(9, '2026-09', 'Lunch', 4, 'Old', { ordered_at: '2026-09-02T06:00:00.000Z' }),
        order(9, '2026-09', 'Lunch', 5, 'New', { ordered_at: new Date('2026-09-20T06:00:00.000Z') })
      ],
      currentOrders: [],
      targetMonth: '2026-10',
      timeSlot: 'Lunch'
    });
    expect(suggestions[0].latest_history.receiver_name).toBe('New');
  });
});
