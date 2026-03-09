const BASE = '/api/tiger';

async function call(params: Record<string, string | number>): Promise<string> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  );
  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function getBalance(): Promise<number> {
  const text = await call({ action: 'getBalance' });
  if (!text.startsWith('ACCESS_BALANCE:')) throw new Error(text);
  const rubBalance = parseFloat(text.split(':')[1]);
  return rubBalance / 95;
}

export interface NumberSession {
  activationId: string;
  phone: string;
}

export async function getNumber(service: string, country: number): Promise<NumberSession> {
  const text = await call({ action: 'getNumber', service, country });
  if (!text.startsWith('ACCESS_NUMBER:')) throw new Error(text);
  const parts = text.split(':');
  return { activationId: parts[1], phone: parts[2] };
}

export type ActivationStatus =
  | { type: 'WAIT_CODE' }
  | { type: 'WAIT_RESEND' }
  | { type: 'OK'; code: string }
  | { type: 'CANCEL' };

export async function getStatus(activationId: string, retries = 3): Promise<ActivationStatus> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const text = await call({ action: 'getStatus', id: activationId });
      if (text.startsWith('STATUS_OK:')) return { type: 'OK', code: text.split(':')[1] };
      if (text === 'STATUS_WAIT_CODE') return { type: 'WAIT_CODE' };
      if (text === 'STATUS_WAIT_RESEND') return { type: 'WAIT_RESEND' };
      if (text === 'STATUS_CANCEL') return { type: 'CANCEL' };
      throw new Error(text);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('getStatus: exhausted retries');
}

export async function setStatus(activationId: string, status: 1 | 3 | 6 | 8): Promise<string> {
  return call({ action: 'setStatus', id: activationId, status });
}

export interface ServicePrice {
  price: number;
  phones: number;
}

interface TigerServiceInfo {
  cost: string | number;
  count: string | number;
}

const priceCache = new Map<string, Record<string, ServicePrice>>();
const inflight = new Map<string, Promise<Record<string, ServicePrice>>>();

export async function getPrices(country: number): Promise<Record<string, ServicePrice>> {
  const qs = new URLSearchParams({ action: 'getPrices', country: String(country) });
  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as Record<string, unknown>;

  const result: Record<string, ServicePrice> = {};
  const countryData = json[String(country)];

  if (countryData && typeof countryData === 'object') {
    for (const [service, info] of Object.entries(countryData as Record<string, unknown>)) {
      if (info && typeof info === 'object') {
        const serviceInfo = info as TigerServiceInfo;
        result[service] = {
          price: Number(serviceInfo.cost || 0) / 95,
          phones: Number(serviceInfo.count || 0),
        };
      }
    }
  }

  return result;
}

export async function getPricesByService(service: string): Promise<Record<string, ServicePrice>> {
  const cached = priceCache.get(service);
  if (cached) return cached;

  if (inflight.has(service)) {
    return inflight.get(service)!;
  }

  const qs = new URLSearchParams({ action: 'getPrices', service });
  const promise = fetch(`${BASE}?${qs}`)
    .then(async res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as Record<string, unknown>;
      const result: Record<string, ServicePrice> = {};
      for (const [countryId, info] of Object.entries(json)) {
        if (info && typeof info === 'object') {
          const countryData = info as Record<string, unknown>;
          const serviceInfo = countryData[service] as TigerServiceInfo | undefined;
          if (serviceInfo) {
            result[countryId] = {
              price: Number(serviceInfo.cost || 0) / 95,
              phones: Number(serviceInfo.count || 0),
            };
          }
        }
      }
      priceCache.set(service, result);
      return result;
    })
    .finally(() => {
      inflight.delete(service);
    });

  inflight.set(service, promise);
  return promise;
}
