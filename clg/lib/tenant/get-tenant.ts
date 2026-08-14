export interface CurrentTenant {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  isActive: boolean;
  globalRole: 'superadmin' | null;
}

export interface CurrentMembership {
  id: string;
  collegeId: string;
  role: 'college_admin' | 'student' | 'faculty_spoc' | 'mentor';
  status: string;
}
