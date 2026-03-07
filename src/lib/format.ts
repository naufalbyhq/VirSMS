import { COUNTRY_CODES } from '../constants/countryCodes';

export function formatPhoneNumber(number: string, countryName: string): string {
  if (!number) return '';
  
  const cleanNumber = number.replace(/[\s+]/g, '');
  const countryCode = COUNTRY_CODES[countryName];
  
  if (countryCode && cleanNumber.startsWith(countryCode)) {
    const rest = cleanNumber.slice(countryCode.length);
    return `+${countryCode} ${rest}`;
  }
  
  return `+${cleanNumber}`;
}
