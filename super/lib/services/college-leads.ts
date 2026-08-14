import 'server-only';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchSheetData } from '@/lib/google-sheets';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'demo_scheduled' | 'converted' | 'closed' | 'spam';
export type LeadPriority = 'low' | 'medium' | 'high';

export interface CollegeLead {
  id: string;
  full_name: string;
  work_email: string;
  phone_number: string;
  college_name: string;
  designation: string | null;
  city: string | null;
  state: string | null;
  college_type: string | null;
  student_count: string | null;
  website_url: string | null;
  interest_type: string | null;
  message: string | null;
  consent_given: boolean;
  source_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  notes: string | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadFilters {
  status?: LeadStatus;
  priority?: LeadPriority;
  interest_type?: string;
  state?: string;
  search?: string;
}

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  demo_scheduled: number;
  converted: number;
  closed: number;
  spam: number;
}

function mapSheetRowToLead(row: Record<string, string>, index: number): CollegeLead {
  const fallbackId = `sheet-row-${index}`;
  return {
    id: row.id || row['ID'] || fallbackId,
    full_name: row.full_name || row['Full Name'] || row['Name'] || '',
    work_email: row.work_email || row['Email'] || '',
    phone_number: row.phone_number || row['Phone'] || row['Phone Number'] || '',
    college_name: row.college_name || row['College Name'] || row['College'] || '',
    designation: row.designation || row['Designation'] || null,
    city: row.city || row['City'] || null,
    state: row.state || row['State'] || null,
    college_type: row.college_type || row['College Type'] || null,
    student_count: row.student_count || row['Student Count'] || null,
    website_url: row.website_url || row['Website'] || row['Website URL'] || null,
    interest_type: row.interest_type || row['Interest Type'] || null,
    message: row.message || row['Message'] || null,
    consent_given: (row.consent_given || row['Consent Given']) === 'true' || (row.consent_given || row['Consent Given']) === 'yes' || !!row.consent_given,
    source_page: row.source_page || row['Source Page'] || null,
    utm_source: row.utm_source || row['UTM Source'] || null,
    utm_medium: row.utm_medium || row['UTM Medium'] || null,
    utm_campaign: row.utm_campaign || row['UTM Campaign'] || null,
    utm_term: row.utm_term || row['UTM Term'] || null,
    utm_content: row.utm_content || row['UTM Content'] || null,
    status: (row.status?.toLowerCase() || row['Status']?.toLowerCase() || 'new') as LeadStatus,
    priority: (row.priority?.toLowerCase() || row['Priority']?.toLowerCase() || 'medium') as LeadPriority,
    notes: row.notes || row['Notes'] || null,
    assigned_to: row.assigned_to || row['Assigned To'] || null,
    last_contacted_at: row.last_contacted_at || row['Last Contacted'] || null,
    created_at: row.created_at || row['Created At'] || new Date().toISOString(),
    updated_at: row.updated_at || row['Updated At'] || new Date().toISOString(),
  };
}

export async function listCollegeLeads(filters?: LeadFilters): Promise<CollegeLead[]> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  
  const rawData = await fetchSheetData();
  let leads = rawData.map((row, idx) => mapSheetRowToLead(row, idx));

  // Sorting: newest first
  leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (filters?.status) {
    leads = leads.filter(l => l.status === filters.status);
  }

  if (filters?.priority) {
    leads = leads.filter(l => l.priority === filters.priority);
  }

  if (filters?.interest_type) {
    leads = leads.filter(l => l.interest_type === filters.interest_type);
  }

  if (filters?.state) {
    leads = leads.filter(l => l.state === filters.state);
  }

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    leads = leads.filter(l => 
      l.full_name.toLowerCase().includes(s) || 
      l.work_email.toLowerCase().includes(s) || 
      l.college_name.toLowerCase().includes(s) || 
      l.phone_number.includes(s)
    );
  }

  return leads.slice(0, 100);
}

 
async function _getCollegeLeadById(id: string): Promise<CollegeLead | null> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const rawData = await fetchSheetData();
  const foundIdx = rawData.findIndex(r => (r.id || r['ID'] || `sheet-row-${rawData.indexOf(r)}`) === id);
  return foundIdx !== -1 ? mapSheetRowToLead(rawData[foundIdx], foundIdx) : null;
}

export async function getLeadStats(): Promise<LeadStats> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const rawData = await fetchSheetData();
  const leads = rawData.map((row, idx) => mapSheetRowToLead(row, idx));

  const counts: LeadStats = {
    total: leads.length,
    new: 0,
    contacted: 0,
    qualified: 0,
    demo_scheduled: 0,
    converted: 0,
    closed: 0,
    spam: 0,
  };

  for (const lead of leads) {
    if (lead.status === 'new') counts.new++;
    else if (lead.status === 'contacted') counts.contacted++;
    else if (lead.status === 'qualified') counts.qualified++;
    else if (lead.status === 'demo_scheduled') counts.demo_scheduled++;
    else if (lead.status === 'converted') counts.converted++;
    else if (lead.status === 'closed') counts.closed++;
    else if (lead.status === 'spam') counts.spam++;
  }

  return counts;
}

export interface UpdateLeadInput {
  status?: LeadStatus;
  priority?: LeadPriority;
  notes?: string | null;
  assigned_to?: string | null;
  last_contacted_at?: string | null;
}

export async function updateCollegeLead(id: string, input: UpdateLeadInput): Promise<void> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};

  if (input.status !== undefined) updates.status = input.status;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.assigned_to !== undefined) updates.assigned_to = input.assigned_to;
  if (input.last_contacted_at !== undefined) updates.last_contacted_at = input.last_contacted_at;

  if (Object.keys(updates).length === 0) return;

  const { error } = await admin
    .from('college_leads')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function deleteCollegeLead(id: string): Promise<void> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();

  const { error } = await admin
    .from('college_leads')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function exportLeadsCSV(filters?: LeadFilters): Promise<string> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const leads = await listCollegeLeads(filters);

  const headers = [
    'ID',
    'Full Name',
    'Email',
    'Phone',
    'College Name',
    'Designation',
    'City',
    'State',
    'College Type',
    'Student Count',
    'Interest Type',
    'Website',
    'Message',
    'Status',
    'Priority',
    'Notes',
    'Created At',
    'Last Contacted',
  ];

  const rows = leads.map((lead) => [
    lead.id,
    lead.full_name,
    lead.work_email,
    lead.phone_number,
    lead.college_name,
    lead.designation ?? '',
    lead.city ?? '',
    lead.state ?? '',
    lead.college_type ?? '',
    lead.student_count ?? '',
    lead.interest_type ?? '',
    lead.website_url ?? '',
    (lead.message ?? '').replace(/[\n\r]/g, ' '),
    lead.status,
    lead.priority,
    (lead.notes ?? '').replace(/[\n\r]/g, ' '),
    lead.created_at,
    lead.last_contacted_at ?? '',
  ]);

  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  return csvContent;
}
