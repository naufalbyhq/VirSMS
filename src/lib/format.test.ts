import { describe, it, expect } from 'vitest';
import { formatPhoneNumber, stripCountryCode } from './format';

describe('formatPhoneNumber', () => {
  it('formats a known number with country code correctly', () => {
    expect(formatPhoneNumber('1234567890', 'United States')).toBe('+1 234567890');
  });

  it('formats a number without known country code with a plus prefix', () => {
    expect(formatPhoneNumber('441234567890', 'Unknown')).toBe('+441234567890');
  });

  it('returns empty string for empty input', () => {
    expect(formatPhoneNumber('', 'United States')).toBe('');
  });

  it('cleans spaces and plus signs before formatting', () => {
    expect(formatPhoneNumber('+1 234 567 890', 'United States')).toBe('+1 234567890');
  });
});

describe('stripCountryCode', () => {
  it('strips the country code correctly', () => {
    expect(stripCountryCode('1234567890', 'United States')).toBe('234567890');
  });

  it('returns the full number if country code is not present', () => {
    expect(stripCountryCode('441234567890', 'United States')).toBe('441234567890');
  });

  it('returns empty string for empty input', () => {
    expect(stripCountryCode('', 'United States')).toBe('');
  });

  it('cleans spaces and plus signs before stripping', () => {
    expect(stripCountryCode('+1 234 567 890', 'United States')).toBe('234567890');
  });
});
