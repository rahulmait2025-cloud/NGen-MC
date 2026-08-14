export interface StudentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  isActive: boolean;
}

export interface StudentMembership {
  id: string;
  collegeId: string;
  role: 'student';
  status: string;
}

export interface StudentTenant {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export interface StudentAuthContext {
  user: StudentUser;
  membership: StudentMembership;
  studentId: string;
  tenant: StudentTenant;
  isGlobal: boolean;
  collegeId: string | null;
  isSuperAdmin?: boolean;
}

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
  avatarUrl?: string | null;
  isActive: boolean;
}

export interface CurrentMembership {
  id: string;
  collegeId: string;
  role: 'college_admin' | 'student' | 'faculty_spoc';
  status: string;
}

export interface CurrentStudentRecord {
  id: string;
  student_code: string | null;
  year_or_semester: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  placement_ready_status: string | null;
  created_at: string;
  bio?: string | null;
}
