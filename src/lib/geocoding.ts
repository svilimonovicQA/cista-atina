import { GITHUB_URL } from "./constants";

export type Place = { address: string | null; district: string | null };

type NominatimResponse = {
  name?: string;
  address?: Record<string, string | undefined>;
};

// Nominatim pravila korišćenja traže prepoznatljiv User-Agent i najviše 1 zahtev u sekundi.
// https://operations.osmfoundation.org/policies/nominatim/
const USER_AGENT = `CistaAtina/0.1 (+${GITHUB_URL})`;

/** Adresa i deo grada za koordinate (OpenStreetMap Nominatim). Vraća null ako servis ne odgovori. */
export async function reverseGeocode(lat: number, lng: number): Promise<Place | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    format: "jsonv2",
    // Zaokruživanje na ~1 m da bi keš radio za susedne zahteve.
    lat: lat.toFixed(5),
    lon: lng.toFixed(5),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "sr-Latn",
  }).toString();

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as NominatimResponse;
    const a = data.address ?? {};
    const street = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? a.square ?? a.park;
    const address = street ? [street, a.house_number].filter(Boolean).join(" ") : (data.name ?? null);
    // `quarter` je obično naziv dela grada („Stari grad“, „Liman“), a `suburb` mesna zajednica.
    const district = a.quarter ?? a.suburb ?? a.neighbourhood ?? a.city_district ?? a.village ?? a.town ?? null;

    return { address: address || null, district };
  } catch {
    return null;
  }
}
