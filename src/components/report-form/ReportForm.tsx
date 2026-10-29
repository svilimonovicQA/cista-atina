"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { STATUS_BADGE, STATUS_LABELS } from "@/lib/constants";
import type { Place } from "@/lib/geocoding";
import type { Category, PublicReport } from "@/lib/types";
import { DESCRIPTION_MAX, reportSchema, type ReportField } from "@/lib/validation";
import { createReport, findNearbyReports, lookupAddress } from "@/server/reports";

import type { LatLng } from "./LocationPicker";
import { PhotoInput, type Photo } from "./PhotoInput";
import { TURNSTILE_ENABLED, Turnstile } from "./Turnstile";

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-2xl bg-slate-100 sm:h-80" />,
});

type FieldErrors = Partial<Record<ReportField, string>>;

type FormProps = { categories: Category[]; demo: boolean };

export function ReportForm(props: FormProps) {
  // Nova prijava = novi primerak forme (čisto stanje, nova mapa i Turnstile).
  const [round, setRound] = useState(0);
  return <ReportFormInner key={round} {...props} onRestart={() => setRound((n) => n + 1)} />;
}

function ReportFormInner({ categories, demo, onRestart }: FormProps & { onRestart: () => void }) {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [nearby, setNearby] = useState<PublicReport[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Adresa za položaj pina (sa zadrškom, da ne šaljemo zahtev za svaki pomeraj mape).
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setPlaceLoading(true);
    const timer = setTimeout(async () => {
      const result = await lookupAddress(location.lat, location.lng);
      if (!cancelled) {
        setPlace(result);
        setPlaceLoading(false);
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [location]);

  // Upozorenje ako u blizini već postoji ista vrsta prijave.
  useEffect(() => {
    if (!location || !categoryId) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await findNearbyReports(location.lat, location.lng, categoryId);
      if (!cancelled) setNearby(result);
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [location, categoryId]);

  function handleLocation(position: LatLng) {
    setLocation(position);
    setErrors((e) => ({ ...e, location: undefined }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const values = {
      categoryId: categoryId ?? 0,
      description,
      lat: location?.lat ?? 0,
      lng: location?.lng ?? 0,
      email,
    };
    const parsed = reportSchema.safeParse(values);
    const nextErrors: FieldErrors = {};
    if (!location) nextErrors.location = "Pomeri mapu tako da pin bude na mestu problema.";
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        let field = issue.path[0] as ReportField;
        if (field === "lat" || field === "lng") field = "location";
        nextErrors[field] ??= issue.message;
      }
    }
    if (TURNSTILE_ENABLED && !token) setFormError("Sačekaj da se završi provera da nisi robot.");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Proveri označena polja.");
      document.querySelector("[data-invalid=true]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (TURNSTILE_ENABLED && !token) return;

    const formData = new FormData();
    formData.set("categoryId", String(values.categoryId));
    formData.set("description", description);
    formData.set("lat", String(values.lat));
    formData.set("lng", String(values.lng));
    formData.set("email", email);
    formData.set("turnstileToken", token);
    photos.forEach((p) => formData.append("photos", p.file));

    startTransition(async () => {
      try {
        const result = await createReport(formData);
        if (result.ok) {
          setCreatedId(result.id);
          window.scrollTo({ top: 0 });
          return;
        }
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
      } catch {
        setFormError("Veza sa serverom nije uspela. Proveri internet i pokušaj ponovo.");
      }
      setTurnstileReset((n) => n + 1);
    });
  }

  if (createdId) return <SuccessScreen reportId={createdId} onRestart={onRestart} />;

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 pb-28 sm:pb-8">
      {demo && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Demo režim: baza nije podešena, pa prijava neće biti sačuvana.
        </div>
      )}

      <Section step={1} title="Gde je problem?" hint="Pomeri mapu tako da vrh pina bude tačno na mestu problema." error={errors.location}>
        <LocationPicker onChange={handleLocation} />
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 text-emerald-600" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18s6-5.3 6-10a6 6 0 10-12 0c0 4.7 6 10 6 10zm0-7.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
          </svg>
          {!location ? (
            <span className="text-slate-400">Lokacija još nije izabrana</span>
          ) : placeLoading ? (
            <span className="text-slate-400">Tražim adresu…</span>
          ) : (
            <span>{[place?.address, place?.district].filter(Boolean).join(", ") || "Adresa nije pronađena, ali lokacija je zabeležena"}</span>
          )}
        </div>
      </Section>

      <Section step={2} title="Šta je problem?" error={errors.categoryId}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((category) => {
            const selected = categoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setCategoryId(category.id);
                  setErrors((e) => ({ ...e, categoryId: undefined }));
                }}
                className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left text-sm font-medium transition ${
                  selected ? "border-transparent text-white shadow-md" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
                style={selected ? { backgroundColor: category.color } : undefined}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-lg ${selected ? "bg-white/25" : ""}`}
                  style={selected ? undefined : { backgroundColor: `${category.color}1f` }}
                  aria-hidden="true"
                >
                  {category.icon}
                </span>
                <span className="leading-tight">{category.name_sr}</span>
              </button>
            );
          })}
        </div>

        {nearby.length > 0 && location && categoryId && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              U blizini već postoji slična prijava. Da li je to isti problem?
            </p>
            <ul className="mt-2 space-y-2">
              {nearby.map((report) => (
                <li key={report.id} className="flex items-start justify-between gap-3 rounded-xl bg-white p-3 text-sm">
                  <span className="min-w-0">
                    <span className="mr-2">{categoryById.get(report.category_id)?.icon}</span>
                    <span className="text-slate-700">{report.description}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[report.status]}`}>
                      {STATUS_LABELS[report.status]}
                    </span>
                    <Link href={`/?prijava=${report.id}`} className="text-xs font-medium text-emerald-700 hover:underline">
                      Pogledaj
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-amber-800">Ako je u pitanju nešto drugo, slobodno nastavi sa prijavom.</p>
          </div>
        )}
      </Section>

      <Section step={3} title="Opiši ukratko" error={errors.description}>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setErrors((er) => ({ ...er, description: undefined }));
          }}
          rows={4}
          maxLength={DESCRIPTION_MAX}
          placeholder="Npr. Kese sa smećem ostavljene pored klupe, ima i krupnog otpada."
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
        <div className="mt-1 text-right text-xs tabular-nums text-slate-400">
          {description.length}/{DESCRIPTION_MAX}
        </div>
      </Section>

      <Section step={4} title="Fotografija" optional hint="Slika mnogo pomaže volonterima da procene šta je potrebno.">
        <PhotoInput photos={photos} onChange={setPhotos} error={errors.photos} />
      </Section>

      <Section step={5} title="Kontakt" optional error={errors.email}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((er) => ({ ...er, email: undefined }));
          }}
          placeholder="tvoj@email.com"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
        <p className="mt-2 text-xs text-slate-500">
          Javićemo ti kad problem bude rešen. Email nije javan i koristi se samo za obaveštenja o ovoj prijavi.
        </p>
      </Section>

      <Turnstile onToken={setToken} resetKey={turnstileReset} />

      {formError && (
        <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 p-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-70"
        >
          {pending && <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {pending ? "Šaljem prijavu…" : "Pošalji prijavu"}
        </button>
      </div>
    </form>
  );
}

function Section({
  step,
  title,
  hint,
  optional,
  error,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-invalid={Boolean(error)}
      className={`rounded-3xl border bg-white p-4 shadow-sm sm:p-5 ${error ? "border-red-300 ring-1 ring-red-300" : "border-slate-200"}`}
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
          {step}
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">
            {title}
            {optional && <span className="ml-2 text-xs font-normal text-slate-400">opciono</span>}
          </h2>
          {hint && <p className="text-sm text-slate-500">{hint}</p>}
        </div>
      </div>
      {children}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}

function SuccessScreen({ reportId, onRestart }: { reportId: string; onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-8 text-emerald-600" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-900">Hvala! Prijava je poslata.</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-600">
        Tvoja prijava je sada na mapi. Koordinatori će je pregledati, a volonteri će se pobrinuti za ostalo.
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        <Link
          href={`/?prijava=${reportId}`}
          className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
        >
          Pogledaj na mapi
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Prijavi još jedan problem
        </button>
      </div>
    </div>
  );
}
