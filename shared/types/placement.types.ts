export interface PlacementListing {
  id: string;
  title: string;
  company: string;
  description: string;
  skills: string[]; // Array of strings
  created_at: string;
  status: 'active' | 'closed';
}

export interface CreatePlacementDto {
  title: string;
  company: string;
  description: string;
  skills: string[];
}
