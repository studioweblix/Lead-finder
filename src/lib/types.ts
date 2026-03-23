export interface Lead {
  name: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  postal: string;
  rating: number;
  reviews: number;
  category: string;
  subtypes: string;
  photo: string;
  description: string;
  verified: boolean;
}

export interface ScoredLead extends Lead {
  _s: number;
  _r: string[];
}

export interface ScoreInfo {
  bg: string;
  border: string;
  text: string;
  label: string;
}

export type FilterType = "all" | "hot" | "no-website" | "has-website" | "has-phone";
export type SortType = "score" | "name" | "rating";
