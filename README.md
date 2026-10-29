# ✨ Čista Atina

> **Volonteri za lepši Novi Sad.** Građani prijavljuju mesta kojima treba čišćenje, krečenje ili popravka, a volonteri ih sređuju.

Čista Atina je otvorena web platforma za volontersku grupu koja želi da ulepša Novi Sad. Svako može da označi problem na mapi grada: divlju deponiju, išaranu fasadu, polomljenu klupu, zapušten park. Koordinatori zatim te prijave proveravaju, planiraju akcije i beleže rezultate sa fotografijama „pre“ i „posle“.

Projekat je zamišljen kao **osnova za dalju nadogradnju**: čist kod, jasna struktura i besplatna infrastruktura, kako bi novi volonteri-programeri mogli brzo da se uključe.

---

## Sadržaj

- [Ideja](#-ideja)
- [Kako platforma radi](#-kako-platforma-radi)
- [Tech stack](#-tech-stack)
- [Arhitektura](#-arhitektura)
- [Model podataka](#-model-podataka)
- [Bezbednost i privatnost](#-bezbednost-i-privatnost)
- [Pokretanje projekta](#-pokretanje-projekta)
- [Struktura projekta](#-struktura-projekta)
- [Šta je urađeno](#-šta-je-urađeno)
- [Plan razvoja (roadmap)](#-plan-razvoja-roadmap)
- [Kako da doprineseš](#-kako-da-doprineseš)
- [Česti problemi](#-česti-problemi)

---

## 💡 Ideja

**Problem:** građani svakodnevno primećuju mesta koja ruže grad, ali ne znaju kome da jave, a volonteri koji žele da pomognu nemaju pregled gde je pomoć najpotrebnija.

**Rešenje:** jedna jednostavna mapa grada na kojoj:

1. **građanin** za manje od 30 sekundi prijavi problem: lokacija, fotografija, kategorija i kratak opis, bez obaveznog naloga;
2. **koordinator** proveri prijavu, spoji duplikate i isplanira volontersku akciju;
3. **volonteri** se prijave na akciju, srede mesto i dodaju fotografiju „posle“;
4. **svi** vide napredak, tj. koliko je mesta rešeno i gde se trenutno radi.

**Principi:**
- **Mobilni na prvom mestu.** Većina prijava stiže sa telefona, na licu mesta.
- **Bez prepreka.** Prijava je moguća anonimno, a nalog je potreban samo onima koji organizuju i rade.
- **Transparentnost.** Svaka promena statusa je javno vidljiva.
- **Besplatno za održavanje.** Sve usluge rade na besplatnim planovima.
- **Lokalno.** Mapa je ograničena na Novi Sad sa okolinom, a interfejs je na srpskom (u planu su ćirilica, mađarski i engleski).

---

## 🗺️ Kako platforma radi

### Uloge

| Uloga | Šta može |
|---|---|
| **Građanin (anoniman)** | Pregleda mapu, prijavljuje problem i opciono ostavlja email za obaveštenje |
| **Registrovani građanin** | Sve to, plus „moje prijave“ i glas „I ja sam ovo primetio/la“ |
| **Volonter** | Prijavljuje se na akcije i dodaje fotografije sa terena |
| **Koordinator** | Proverava prijave, menja status, spaja duplikate i pravi akcije |
| **Admin** | Upravlja kategorijama i ulogama korisnika |

### Životni ciklus prijave

```
 Nova ──► Proverena ──► Planirana ──► U toku ──► Završena
   │          │
   └──────────┴──► Odbijena / Duplikat
```

| Status | Kod | Značenje |
|---|---|---|
| Nova | `new` | Tek prijavljeno, čeka proveru |
| Proverena | `verified` | Koordinator je potvrdio da problem postoji |
| Planirana | `planned` | Uvršteno u konkretnu volontersku akciju |
| U toku | `in_progress` | Volonteri trenutno rade na tome |
| Završena | `done` | Rešeno (uz fotografiju „posle“) |
| Odbijena | `rejected` | Neosnovana ili neprikladna prijava |
| Duplikat | `duplicate` | Ista stvar je već prijavljena (sa vezom na original) |

Svaka promena statusa se **automatski** beleži u istoriju (`report_status_history`) pomoću trigera u bazi.

### Kategorije

| | Kategorija |
|---|---|
| 🗑️ | Čišćenje / smeće |
| 🖌️ | Krečenje / fasade |
| 🎨 | Grafiti |
| 🪑 | Oštećen mobilijar (klupe, kante) |
| 🌳 | Zelene površine |
| 📍 | Ostalo |

Kategorije se čuvaju u bazi (tabela `categories`), pa se dodaju i menjaju bez izmene koda.

---

## 🧰 Tech stack

| Sloj | Tehnologija | Zašto baš ona |
|---|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router) | Frontend i backend u jednom projektu. Server Components i Server Actions umesto zasebnog API-ja. |
| Jezik | [TypeScript](https://www.typescriptlang.org) | Tipovi hvataju greške pre pokretanja i olakšavaju snalaženje novim članovima tima |
| UI | [React 19](https://react.dev) + [Tailwind CSS 4](https://tailwindcss.com) | Brza izrada responzivnog interfejsa bez posebnih CSS fajlova |
| Mapa | [Leaflet](https://leafletjs.com) + [react-leaflet](https://react-leaflet.js.org) | Lagana, proverena biblioteka, radi odlično na mobilnom |
| Grupisanje pinova | [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) | Mapa ostaje pregledna i sa stotinama prijava |
| Podloga mape | [OpenStreetMap](https://www.openstreetmap.org) | Besplatno, bez API ključa, odlična pokrivenost Novog Sada |
| Baza | [Supabase](https://supabase.com) – PostgreSQL + [PostGIS](https://postgis.net) | Geo upiti (npr. „prijave u krugu od 30 m“), Row Level Security, besplatno do 500 MB |
| Autentifikacija | Supabase Auth | Magic link (email bez lozinke) i Google prijava |
| Fajlovi | Supabase Storage | Fotografije prijava (bucket `report-photos`) |
| Validacija | [Zod](https://zod.dev) | Ista pravila validacije u formi i na serveru |
| Kompresija slika | [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) | Fotografija od ~5 MB sa telefona se pre slanja smanji na ~300 KB |
| Zaštita od spama | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) | Besplatna, nevidljiva CAPTCHA, neophodna za anonimne prijave |
| Hosting | [Vercel](https://vercel.com) | Besplatno, automatski deploy pri svakom push-u na GitHub |
| Email (planirano) | [Resend](https://resend.com) | Obaveštenja „Vaša prijava je rešena“ (3000 mejlova mesečno besplatno) |

**Mesečni trošak: 0 €.**

---

## 🏗️ Arhitektura

```
┌──────────────────────────── Browser (telefon / računar) ────────────────────────────┐
│  React komponente  ·  Leaflet mapa  ·  filteri, pretraga, lista prijava              │
└──────────────┬───────────────────────────────────────────────────────▲──────────────┘
               │ HTTP                                                  │ HTML + RSC
┌──────────────▼───────────────────── Next.js (Vercel) ────────────────┴──────────────┐
│  Server Components  → čitaju podatke (reports_public, categories)                   │
│  Server Actions     → upis prijave (posle Turnstile provere), promena statusa       │
│  Middleware         → osvežava Supabase sesiju (auth kolačići)                      │
└──────────────┬──────────────────────────────────────────────────────────────────────┘
               │ supabase-js (anon ključ + korisnička sesija / service-role ključ)
┌──────────────▼───────────────────────── Supabase ───────────────────────────────────┐
│  PostgreSQL + PostGIS  ·  Row Level Security  ·  Auth  ·  Storage (fotografije)     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Tok čitanja:** početna stranica (`src/app/page.tsx`) je Server Component. Ona iz Supabase-a čita javni pogled `reports_public` i kategorije, pa ih prosleđuje klijentskoj komponenti `ReportsExplorer`. Ta komponenta drži stanje filtera i iscrtava mapu i listu.

**Tok upisa (prijava problema):**

```
Forma (/prijavi)
  ├─ pomeranje mape ──► lookupAddress()        ──► Nominatim (adresa i deo grada)
  ├─ lokacija + kat. ──► findNearbyReports()   ──► RPC nearby_reports (mogući duplikati)
  ├─ fotografije ─────► kompresija u browseru (max 1600 px, ~0,5 MB, bez EXIF-a)
  └─ „Pošalji“ ───────► createReport()
                          1. Zod validacija (ista šema kao u formi)
                          2. provera fotografija (tip, veličina, najviše 3)
                          3. Cloudflare Turnstile provera
                          4. rate limit: najviše 5 prijava za 10 min sa iste IP adrese (čuva se samo heš)
                          5. adresa iz koordinata (Nominatim)
                          6. upis u `reports` + slike u Storage + `report_photos`
                          7. osvežavanje mape ──► „Hvala!“ ──► /?prijava=<id>
```

Server akcije su u `src/server/reports.ts`. Anonimni korisnici nikad ne pišu direktno u bazu, već upis radi server preko service-role klijenta, i to tek posle svih provera.

**Demo režim:** ako `.env.local` nije podešen, aplikacija prikazuje ugrađene demo podatke (`src/lib/demo-data.ts`). Tako se interfejs može razvijati bez baze.

---

## 🗄️ Model podataka

```
profiles ─┬─< reports >── categories
          │     │  ├─< report_photos
          │     │  ├─< report_status_history
          │     │  └─< upvotes >── profiles
          │     └─< action_reports >── actions ─< action_participants >── profiles
```

| Tabela | Opis |
|---|---|
| `profiles` | Profil korisnika (veza sa `auth.users`) i uloga: `citizen` / `volunteer` / `coordinator` / `admin` |
| `categories` | Kategorije: naziv, emoji ikonica, boja, redosled |
| `reports` | Prijava: opis, status, **lokacija `geography(Point)`**, adresa, deo grada, prijavilac, email (nije javan), veza na duplikat, broj glasova |
| `report_photos` | Fotografije prijave, tip `before` / `after` |
| `report_status_history` | Dnevnik promena statusa (puni se trigerom) |
| `actions` | Volonterske akcije: naslov, datum, mesto okupljanja, potreban alat |
| `action_reports` | Koje prijave se rešavaju na kojoj akciji |
| `action_participants` | Ko dolazi na akciju |
| `upvotes` | Glasovi „I ja sam ovo primetio/la“ |

**Pogled `reports_public`** je javna verzija tabele `reports`. U njemu nema emaila prijavioca, a lokacija je razbijena na `lat` / `lng` brojeve radi lakšeg korišćenja na frontendu.

**Funkcije i trigeri:**
- `nearby_reports(lat, lng, cat, radius_m)` nalazi otvorene prijave iste kategorije u blizini (za upozorenje o duplikatu)
- `is_staff()` proverava da li je trenutni korisnik koordinator ili admin (koristi se u RLS pravilima)
- `handle_new_user` automatski pravi profil pri registraciji
- `log_report_status` beleži svaku promenu statusa
- `sync_upvotes_count` održava broj glasova

SQL se nalazi u [`supabase/migrations/`](supabase/migrations/):
- `0001_init.sql`: tabele, tipovi, trigeri, RLS pravila, storage bucket, početne kategorije
- `0002_grants.sql`: eksplicitna prava pristupa za uloge `anon`, `authenticated` i `service_role` (novi Supabase projekti ih ne dodeljuju automatski)
- `0003_reporter_ip_hash.sql`: kolona sa hešom IP adrese za rate limit anonimnih prijava

---

## 🔒 Bezbednost i privatnost

- **Row Level Security** je uključen na svim tabelama. Javnost čita samo ono što je javno, a status menjaju samo koordinatori.
- **Email prijavioca nikada nije javan.** Ne postoji u `reports_public`, a tabelu `reports` direktno čitaju samo koordinatori i sam prijavilac.
- **Uloge ne može da menja sam korisnik.** Korisnik sme da izmeni samo svoje ime, preko dozvole na nivou kolone.
- **Service-role ključ** se koristi isključivo na serveru, posle sopstvene provere. Nikad ne ide u browser i nema prefiks `NEXT_PUBLIC_`.
- **Turnstile + rate limit** štite anonimne prijave od spama. Sa jedne IP adrese može se poslati najviše 5 prijava za 10 minuta. U bazi se čuva samo SHA-256 heš IP adrese (sa tajnom „solju“), nikad sama adresa, i nije javno vidljiv.
- **EXIF podaci** (GPS, model telefona) se brišu sa fotografija, jer se slika u browseru ponovo kodira pre slanja.
- **Validacija na serveru:** sve što stigne iz forme se ponovo proverava (Zod šema, lokacija unutar Novog Sada, tip i veličina slika), bez obzira na proveru u browseru.
- Na formi stoji napomena da se email koristi samo za obaveštenja o prijavi i da nije javan.

---

## 🚀 Pokretanje projekta

### Preduslovi
- [Node.js](https://nodejs.org) 20 ili noviji
- Git
- (opciono) besplatan nalog na [supabase.com](https://supabase.com)

### 1. Kloniranje i instalacija

```bash
git clone https://github.com/svilimonovicQA/cista-atina.git
cd cista-atina
npm install
npm run dev
```

Otvori http://localhost:3000. **Bez dodatnog podešavanja aplikacija radi sa demo podacima.**

### 2. Povezivanje sa Supabase bazom

1. Napravi projekat na [supabase.com/dashboard](https://supabase.com/dashboard). Region: **Central EU (Frankfurt)**.
2. Otvori **SQL Editor → New query**, nalepi sadržaj `supabase/migrations/0001_init.sql` i klikni **Run**.
3. Ponovi isto za `supabase/migrations/0002_grants.sql` i `0003_reporter_ip_hash.sql`, tim redom.
4. Kopiraj `.env.example` u `.env.local` i popuni vrednosti:

| Promenljiva | Gde se nalazi u Supabase dashboardu |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API → *Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API Keys → *Publishable key* (ili legacy *anon*) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → *Secret key* (ili legacy *service_role*). ⚠️ **tajno** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare → Turnstile → Add widget. Za lokalni rad: `1x00000000000000000000AA` |
| `TURNSTILE_SECRET_KEY` | Isto mesto. Za lokalni rad: `1x0000000000000000000000000000000AA` |

5. Restartuj `npm run dev`. Next.js čita env fajl samo pri pokretanju.

### 3. Demo prijave (opciono)

Da mapa ne bi bila prazna, u bazu možeš da upišeš 10 primera prijava na stvarnim lokacijama (Štrand, Dunavski park, Petrovaradinska tvrđava…):

```bash
npm run seed:demo              # dodaje demo prijave (bezbedno je pokrenuti više puta)
npm run seed:demo -- --remove  # briše ih, npr. pre puštanja sajta u rad
```

Podaci se nalaze u [`supabase/demo-reports.json`](supabase/demo-reports.json). Iste prijave se prikazuju i u demo režimu bez baze.

### 4. Dodela uloge koordinatora

Posle prve prijave na sistem pokreni u SQL Editoru:

```sql
update profiles set role = 'coordinator'
where id = (select id from auth.users where email = 'ime@primer.rs');
```

### Skripte

| Komanda | Šta radi |
|---|---|
| `npm run dev` | Razvojni server sa automatskim osvežavanjem |
| `npm run build` | Produkcioni build (uključuje proveru tipova) |
| `npm run start` | Pokreće produkcioni build |
| `npm run lint` | ESLint provera koda |
| `npm run seed:demo` | Upisuje demo prijave u bazu (`-- --remove` ih briše) |

---

## 📁 Struktura projekta

```
cista-atina/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              # Osnovni HTML, fontovi, metapodaci
│  │  ├─ page.tsx                # Početna: učitava prijave, kategorije i fotografije
│  │  ├─ prijavi/page.tsx        # Stranica za prijavu problema
│  │  ├─ globals.css             # Tailwind + stilovi mape (pinovi, klasteri, popup)
│  │  └─ icon.svg                # Favicon / logo
│  ├─ components/
│  │  ├─ brand/Logo.tsx          # Logo i naziv
│  │  ├─ explorer/
│  │  │  ├─ ReportsExplorer.tsx  # Glavni ekran: bočni panel, mobilni donji panel, stanje filtera
│  │  │  ├─ Filters.tsx          # Čipovi kategorija, tabovi statusa
│  │  │  ├─ ReportList.tsx       # Kartice prijava
│  │  │  └─ Stats.tsx            # Brojači: nove / u radu / rešene
│  │  ├─ map/
│  │  │  └─ MapView.tsx          # Leaflet mapa, klasteri, popup, „moja lokacija“
│  │  └─ report-form/
│  │     ├─ ReportForm.tsx       # Forma za prijavu (5 koraka) i ekran „Hvala!“
│  │     ├─ LocationPicker.tsx   # Mapa sa fiksnim pinom u centru + GPS
│  │     ├─ PhotoInput.tsx       # Izbor, kompresija i pregled fotografija
│  │     └─ Turnstile.tsx        # Cloudflare Turnstile widget
│  ├─ lib/
│  │  ├─ supabase/server.ts      # Supabase klijent za server (+ service-role klijent)
│  │  ├─ supabase/client.ts      # Supabase klijent za browser
│  │  ├─ constants.ts            # Naziv, granice grada, statusi i njihove boje
│  │  ├─ format.ts               # „pre 3 dana“, srpska množina
│  │  ├─ types.ts                # TypeScript tipovi
│  │  ├─ validation.ts           # Zod šema prijave, pravila za fotografije
│  │  ├─ geocoding.ts            # Adresa iz koordinata (Nominatim)
│  │  ├─ turnstile.ts            # Serverska provera Turnstile tokena
│  │  └─ demo-data.ts            # Demo prijave (kada baza nije podešena)
│  ├─ server/
│  │  └─ reports.ts              # Server akcije: createReport, lookupAddress, findNearbyReports
│  └─ middleware.ts              # Osvežavanje Supabase sesije
├─ supabase/
│  ├─ migrations/                # SQL šema baze
│  └─ demo-reports.json          # 10 demo prijava (za seed i demo režim)
├─ scripts/seed-demo.mjs         # Upis i brisanje demo prijava
├─ .env.example                  # Šablon za .env.local
└─ README.md
```

---

## ✅ Šta je urađeno

### Infrastruktura
- [x] Next.js 15 + TypeScript + Tailwind CSS 4 projekat
- [x] Supabase klijenti za server i browser, middleware za sesiju
- [x] Demo režim bez baze
- [x] GitHub repozitorijum

### Baza
- [x] Kompletna šema: prijave, fotografije, istorija statusa, akcije, učesnici, glasovi
- [x] PostGIS geo-lokacija i prostorni indeks
- [x] Row Level Security pravila za sve tabele
- [x] Javni pogled bez ličnih podataka
- [x] Trigeri: automatski profil, istorija statusa, brojač glasova
- [x] Funkcija za pronalaženje duplikata u blizini
- [x] Storage bucket za fotografije
- [x] Početne kategorije

### Interfejs
- [x] Interaktivna mapa Novog Sada (ograničena na područje grada)
- [x] Pinovi u boji kategorije sa emoji ikonicom, a rešene prijave su sive
- [x] Grupisanje pinova (klasteri) kada ih je mnogo
- [x] Popup sa detaljima prijave
- [x] Dugme „Moja lokacija“ (GPS)
- [x] Filteri po kategorijama (sa brojem prijava), po statusu (aktivne / rešene / sve) i pretraga
- [x] Lista prijava: klik na karticu vodi do pina na mapi, a klik na pin označava karticu
- [x] Statistika: nove / u radu / rešene
- [x] **Desktop:** bočni panel sa svim filterima i listom
- [x] **Mobilni:** plutajući logo i čipovi na vrhu, donji panel sa listom koji se izvlači
- [x] Logo i favicon

### Prijava problema (`/prijavi`)
- [x] Izbor lokacije: pin je fiksiran u centru i pomera se mapa, uz dugme „Koristi moju lokaciju“ (automatski, ako je dozvola već data)
- [x] Prikaz adrese i dela grada za izabranu lokaciju (Nominatim)
- [x] Izbor kategorije karticama
- [x] Upozorenje ako u krugu od 30 m već postoji otvorena prijava iste kategorije
- [x] Opis sa brojačem karaktera
- [x] Do 3 fotografije: kamera ili galerija, kompresija u browseru, brisanje EXIF-a, pregled i uklanjanje
- [x] Opcioni email za obaveštenje
- [x] Cloudflare Turnstile zaštita
- [x] Validacija u formi i na serveru, greške prikazane uz svako polje
- [x] Rate limit po IP adresi (heš)
- [x] Ekran „Hvala!“ sa linkom koji otvara novu prijavu na mapi
- [x] Fotografije se prikazuju u popup-u na mapi i u listi prijava

---

## 🛣️ Plan razvoja (roadmap)

### Faza 1: MVP
- [x] Postavka projekta, šema baze, mapa sa filterima
- [x] Forma za prijavu: lokacija, fotografije, kategorija, opis, Turnstile
- [x] Upozorenje o duplikatu pre slanja (`nearby_reports`)
- [x] Automatska adresa iz koordinata (Nominatim reverse geocoding)
- [ ] Stranica detalja prijave `/prijava/[id]`: galerija, istorija statusa, deljenje
- [ ] Prijava na sistem (magic link)
- [ ] Koordinatorski panel `/admin`: promena statusa, spajanje duplikata, moderacija
- [ ] PWA: instalacija na telefon, ikonice, manifest
- [ ] Deploy na Vercel

### Faza 2: zajednica
- [ ] Volonterske akcije `/akcije`: kalendar, prijava učesnika, mesto okupljanja
- [ ] Galerija „pre / posle“
- [ ] Email obaveštenja (Resend)
- [ ] Glasanje „I ja sam ovo primetio/la“
- [ ] „Moje prijave“ za registrovane građane

### Faza 3: rast
- [ ] Granice mesnih zajednica (GeoJSON) i statistika po delovima grada
- [ ] Javna stranica sa brojkama (očišćena mesta, broj volontera, sati rada)
- [ ] Višejezičnost: srpski (latinica i ćirilica), mađarski, engleski
- [ ] Tamna tema
- [ ] Push notifikacije
- [ ] Izvoz prijava za JKP „Čistoća“ i Grad
- [ ] Nativna mobilna aplikacija (Expo) nad istim Supabase backendom

---

## 🤝 Kako da doprineseš

1. Izaberi issue sa labelom `good first issue` ili predloži svoj.
2. Napravi granu: `git checkout -b feature/kratak-opis`.
3. Napravi izmene i proveri ih:
   ```bash
   npm run lint
   npm run build
   ```
4. Otvori Pull Request sa kratkim opisom i, za UI izmene, screenshot-om.

**Konvencije:**
- Kod (promenljive, funkcije, komponente) piše se na engleskom, a tekst u interfejsu i komentari na srpskom (latinica).
- Jedna komponenta ide u jedan fajl. Logika koja nije UI ide u `src/lib/`.
- Svaka izmena baze je **novi** fajl u `supabase/migrations/` (`0003_...sql`). Postojeće migracije se ne menjaju.
- Tajni ključevi nikad ne idu u git. `.env.local` je u `.gitignore`.

---

## 🩺 Česti problemi

| Problem | Rešenje |
|---|---|
| `permission denied for table ...` (kod `42501`) | Nije pokrenuta migracija `0002_grants.sql` |
| „Prijava nije sačuvana“ / `column reports.reporter_ip_hash does not exist` | Nije pokrenuta migracija `0003_reporter_ip_hash.sql` |
| „Provera da nisi robot nije uspela“ | Turnstile ključevi ne odgovaraju domenu. Za lokalni rad koristi test ključeve iz tabele iznad. |
| `relation "reports_public" does not exist` | Nije pokrenuta migracija `0001_init.sql` |
| I dalje se vide demo podaci | `.env.local` nije popunjen ili server nije restartovan |
| Mapa je prazna | Normalno za novu bazu, jer još nema prijava |
| Na mapi piše „API KEY REQUIRED“ | Korišćena je podloga koja traži ključ (npr. CARTO). Projekat koristi OpenStreetMap, koji ključ ne traži. |
| „Moja lokacija“ ne radi | Browser traži dozvolu za lokaciju. Na telefonu geolokacija radi samo preko HTTPS-a ili na `localhost`-u. |

---

Napravljeno sa ❤️ za Novi Sad.
