export type ReportStatus =
  | "new"
  | "verified"
  | "planned"
  | "in_progress"
  | "done"
  | "rejected"
  | "duplicate";

export type Category = {
  id: number;
  slug: string;
  name_sr: string;
  icon: string;
  color: string;
  sort_order: number;
};

/** Red iz pogleda `reports_public` (bez emaila prijavioca). */
export type PublicReport = {
  id: string;
  category_id: number;
  description: string;
  status: ReportStatus;
  lat: number;
  lng: number;
  address: string | null;
  district: string | null;
  duplicate_of: string | null;
  upvotes_count: number;
  created_at: string;
  updated_at: string;
  /** Prva fotografija „pre“; ne postoji u pogledu, dopunjuje se pri učitavanju. */
  photo_url?: string | null;
};
