'use client';

import React, { useState, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

import type { CollegeWithCounts } from '@/lib/services/colleges';
import type { UserListItem } from '@/lib/services/users';
import type { StudentListItem } from '@/lib/services/students';
import type { CohortRow } from '@/lib/services/cohorts';


import {
  deleteCollegeAction,
  deleteCollegeAdminAction,
  inviteCollegeAdminAction,
  updateCollegeAction,
} from '@/app/(app)/colleges/actions';
import {
  bulkInviteStudentsAction,
  deleteStudentAction,
  inviteStudentAction,
  removeStudentFromCollegeAction,
  updateStudentAction
} from '@/app/(app)/students/actions';

type CollegeDetailState = {
  editOpen: boolean;
  deleteCollegeOpen: boolean;
  pending: boolean;
};
type CollegeDetailAction =
  | { type: 'EDIT_OPEN' }
  | { type: 'EDIT_CLOSE' }
  | { type: 'DELETE_OPEN' }
  | { type: 'DELETE_CLOSE' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END' };

function collegeDetailReducer(state: CollegeDetailState, action: CollegeDetailAction): CollegeDetailState {
  switch (action.type) {
    case 'EDIT_OPEN': return { ...state, editOpen: true };
    case 'EDIT_CLOSE': return { ...state, editOpen: false, pending: false };
    case 'DELETE_OPEN': return { ...state, deleteCollegeOpen: true };
    case 'DELETE_CLOSE': return { ...state, deleteCollegeOpen: false };
    case 'SUBMIT_START': return { ...state, pending: true };
    case 'SUBMIT_END': return { ...state, pending: false };
  }
}

type CollegeAdminState = {
  inviteAdminOpen: boolean;
  adminToDelete: UserListItem | null;
  pending: boolean;
};
type CollegeAdminAction =
  | { type: 'INVITE_OPEN' }
  | { type: 'INVITE_CLOSE' }
  | { type: 'DELETE_OPEN'; admin: UserListItem }
  | { type: 'DELETE_CLOSE' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END' };

function collegeAdminReducer(state: CollegeAdminState, action: CollegeAdminAction): CollegeAdminState {
  switch (action.type) {
    case 'INVITE_OPEN': return { ...state, inviteAdminOpen: true };
    case 'INVITE_CLOSE': return { ...state, inviteAdminOpen: false, pending: false };
    case 'DELETE_OPEN': return { ...state, adminToDelete: action.admin };
    case 'DELETE_CLOSE': return { ...state, adminToDelete: null, pending: false };
    case 'SUBMIT_START': return { ...state, pending: true };
    case 'SUBMIT_END': return { ...state, pending: false };
  }
}

type CollegeStudentState = {
  studentToEdit: StudentListItem | null;
  studentToDelete: StudentListItem | null;
  studentToRemoveFromCollege: StudentListItem | null;
  pending: boolean;
  importSending: boolean;
  importedRows: ImportedStudentRow[];
};
type CollegeStudentAction =
  | { type: 'EDIT_OPEN'; student: StudentListItem }
  | { type: 'EDIT_CLOSE' }
  | { type: 'DELETE_OPEN'; student: StudentListItem }
  | { type: 'DELETE_CLOSE' }
  | { type: 'REMOVE_OPEN'; student: StudentListItem }
  | { type: 'REMOVE_CLOSE' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END' }
  | { type: 'IMPORT_START' }
  | { type: 'IMPORT_END'; rows: ImportedStudentRow[] }
  | { type: 'IMPORT_CLEAR' };

function collegeStudentReducer(state: CollegeStudentState, action: CollegeStudentAction): CollegeStudentState {
  switch (action.type) {
    case 'EDIT_OPEN': return { ...state, studentToEdit: action.student };
    case 'EDIT_CLOSE': return { ...state, studentToEdit: null, pending: false };
    case 'DELETE_OPEN': return { ...state, studentToDelete: action.student };
    case 'DELETE_CLOSE': return { ...state, studentToDelete: null, pending: false };
    case 'REMOVE_OPEN': return { ...state, studentToRemoveFromCollege: action.student };
    case 'REMOVE_CLOSE': return { ...state, studentToRemoveFromCollege: null, pending: false };
    case 'SUBMIT_START': return { ...state, pending: true };
    case 'SUBMIT_END': return { ...state, pending: false };
    case 'IMPORT_START': return { ...state, importSending: true };
    case 'IMPORT_END': return { ...state, importSending: false, importedRows: action.rows };
    case 'IMPORT_CLEAR': return { ...state, importedRows: [], importSending: false };
  }
}


function buildTenantUrl(baseUrl: string, path: string): string {
  if (!baseUrl) return path;
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}

// ============================================================================
// Shell Component (Instant Render)
// ============================================================================
export function CollegeDetailShell({ college }: { college: CollegeWithCounts }) {
  const router = useRouter();
  const [detailState, dispatchDetail] = useReducer(collegeDetailReducer, {
    editOpen: false,
    deleteCollegeOpen: false,
    pending: false,
  } as CollegeDetailState);
  const { editOpen, deleteCollegeOpen, pending } = detailState;

  const collegeAdminBaseUrl = process.env.NEXT_PUBLIC_COLLEGE_ADMIN_APP_URL ?? '';
  const studentBaseUrl = process.env.NEXT_PUBLIC_LMS_APP_URL ?? '';

  const collegeAdminLoginUrl = buildTenantUrl(collegeAdminBaseUrl, `/c/${college.slug}/admin/login`);
  const studentLoginUrl = buildTenantUrl(studentBaseUrl, `/c/${college.slug}/student/login`);

  const handleEditCollege = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatchDetail({ type: 'SUBMIT_START' });
    const formData = new FormData(event.currentTarget);
    formData.set('college_id', college.id);
    const result = await updateCollegeAction(formData);
    if (!result.ok) {
      dispatchDetail({ type: 'SUBMIT_END' });
      toast.error(result.error);
      return;
    }
    toast.success('College updated.');
    dispatchDetail({ type: 'EDIT_CLOSE' });
    router.refresh();
  };

  const handleDeleteCollege = async () => {
    dispatchDetail({ type: 'SUBMIT_START' });
    const formData = new FormData();
    formData.set('college_id', college.id);
    const result = await deleteCollegeAction(formData);
    if (!result.ok) {
      dispatchDetail({ type: 'SUBMIT_END' });
      toast.error(result.error);
      return;
    }
    toast.success(`College deleted. Removed ${result.deletedUsers} linked login credentials.`);
    router.push('/colleges');
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>{college.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Slug: {college.slug}</p>
            <p className="text-xs text-muted-foreground mt-1">Status: {college.status}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => dispatchDetail({ type: 'EDIT_OPEN' })}>Edit College</Button>
            <Button variant="destructive" onClick={() => dispatchDetail({ type: 'DELETE_OPEN' })}>Delete College</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>College Admin Login URL:</strong>{' '}
            <a className="underline text-primary break-all" href={collegeAdminLoginUrl} target="_blank" rel="noreferrer">
              {collegeAdminLoginUrl}
            </a>
          </p>
          <p>
            <strong>Student Login URL:</strong>{' '}
            <a className="underline text-primary break-all" href={studentLoginUrl} target="_blank" rel="noreferrer">
              {studentLoginUrl}
            </a>
          </p>
          <p className="text-xs text-destructive">
            Deleting this college will also delete linked student/admin login credentials for this tenant.
          </p>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(v) => !v && dispatchDetail({ type: 'EDIT_CLOSE' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit College</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCollege} className="space-y-3">
            <Input name="name" defaultValue={college.name} required />
            <Input name="short_name" defaultValue={college.short_name ?? ''} placeholder="Short name" />
            <CollegeStatusSelect defaultValue={college.status} />
            <Input name="support_email" type="email" defaultValue={college.support_email || ''} placeholder="Support email" />
            <Input name="support_phone" defaultValue={college.support_phone || ''} placeholder="Support phone" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => dispatchDetail({ type: 'EDIT_CLOSE' })}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteCollegeOpen}
        onClose={() => dispatchDetail({ type: 'DELETE_CLOSE' })}
        title="Delete College"
        description="Are you sure you want to delete this college and remove all linked credentials? This is permanent."
        confirmLabel={pending ? 'Deleting...' : 'Delete College'}
        onConfirm={handleDeleteCollege}
      />
    </>
  );
}


// ============================================================================
// Admin Accounts Component
// ============================================================================
export function CollegeAdminsCard({
  collegeId,
  admins
}: {
  collegeId: string;
  admins: UserListItem[];
}) {
  const router = useRouter();
  const [adminState, dispatchAdmin] = useReducer(collegeAdminReducer, {
    inviteAdminOpen: false,
    adminToDelete: null,
    pending: false,
  } as CollegeAdminState);
  const { inviteAdminOpen, adminToDelete, pending } = adminState;

  const handleInviteAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatchAdmin({ type: 'SUBMIT_START' });
    const formData = new FormData(event.currentTarget);
    formData.set('college_id', collegeId);
    const result = await inviteCollegeAdminAction(formData);
    if (!result.ok) {
      dispatchAdmin({ type: 'SUBMIT_END' });
      toast.error(result.error);
      return;
    }
    toast.success('College admin credentials created.');
    dispatchAdmin({ type: 'INVITE_CLOSE' });
    event.currentTarget.reset();
    router.refresh();
  };

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    dispatchAdmin({ type: 'SUBMIT_START' });
    const formData = new FormData();
    formData.set('college_id', collegeId);
    formData.set('user_id', adminToDelete.user_id);
    const result = await deleteCollegeAdminAction(formData);
    if (!result.ok) {
      dispatchAdmin({ type: 'SUBMIT_END' });
      toast.error(result.error);
      return;
    }
    toast.success('College admin credentials deleted.');
    dispatchAdmin({ type: 'DELETE_CLOSE' });
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row gap-2 justify-between flex-wrap">
          <CardTitle>College Admin Accounts</CardTitle>
          <Button variant="outline" size="sm" onClick={() => dispatchAdmin({ type: 'INVITE_OPEN' })}>Create College Admin</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No admins yet.</TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>{admin.full_name ?? '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{admin.email ?? '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{admin.status}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => dispatchAdmin({ type: 'DELETE_OPEN', admin })}
                        disabled={pending}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={inviteAdminOpen} onOpenChange={(v) => !v && dispatchAdmin({ type: 'INVITE_CLOSE' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create College Admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteAdmin} className="space-y-3">
            <Input name="email" type="email" required placeholder="admin@college.edu" />
            <Input name="full_name" required placeholder="Admin full name" />
            <Input name="password" type="password" required minLength={8} placeholder="Password" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => dispatchAdmin({ type: 'INVITE_CLOSE' })}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? 'Creating...' : 'Create Admin Login'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog
        open={!!adminToDelete}
        onClose={() => dispatchAdmin({ type: 'DELETE_CLOSE' })}
        title="Delete Admin"
        description={`Remove admin credentials for ${adminToDelete?.email}?`}
        confirmLabel={pending ? 'Deleting...' : 'Delete Admin'}
        onConfirm={handleDeleteAdmin}
      />
    </>
  );
}

// ============================================================================
// Students Component
// ============================================================================
type StudentFormMode = 'manual' | 'invite' | 'import';

interface StudentDraftRow {
  key: string;
  email: string;
  full_name: string;
  password: string;
}

function createStudentDraftRow(): StudentDraftRow {
  return {
    key: crypto.randomUUID(),
    email: '',
    full_name: '',
    password: '',
  };
}

export interface ImportedStudentRow {
  email: string;
  full_name: string;
  student_code?: string;
}

export function CollegeStudentsCard({
  collegeId,
  students,
  cohorts
}: {
  collegeId: string;
  students: StudentListItem[];
  cohorts: CohortRow[];
}) {
  const router = useRouter();
  const [studentState, dispatchStudent] = useReducer(collegeStudentReducer, {
    studentToEdit: null,
    studentToDelete: null,
    studentToRemoveFromCollege: null,
    pending: false,
    importSending: false,
    importedRows: [],
  } as CollegeStudentState);
  const { studentToEdit, studentToDelete, studentToRemoveFromCollege, pending, importSending, importedRows } = studentState;
  
  const [studentFormMode, setStudentFormMode] = useState<StudentFormMode>('manual');
  const [studentRows, setStudentRows] = useState<StudentDraftRow[]>([createStudentDraftRow()]);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);

  const handleBulkStudentCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatchStudent({ type: 'SUBMIT_START' });

    const validRows = studentRows.filter((row) => {
      if (!row.email.trim() || !row.full_name.trim()) return false;
      if (studentFormMode === 'manual' && !row.password.trim()) return false;
      return true;
    });
    if (validRows.length === 0) {
      dispatchStudent({ type: 'SUBMIT_END' });
      toast.error(
        studentFormMode === 'manual'
          ? 'Add at least one student with name, email, and password.'
          : 'Add at least one student with name and email.'
      );
      return;
    }

    let successCount = 0;
    const failures: string[] = [];

    const inviteResults = await Promise.allSettled(
      validRows.map(async (row) => {
        const formData = new FormData();
        formData.set('college_id', collegeId);
        formData.set('email', row.email.trim());
        formData.set('full_name', row.full_name.trim());
        formData.set('password', studentFormMode === 'manual' ? row.password.trim() : '');
        if (selectedCohortId) formData.set('cohort_id', selectedCohortId);
        const result = await inviteStudentAction(formData);
        return { email: row.email.trim(), result };
      }),
    );

    for (const r of inviteResults) {
      if (r.status === 'fulfilled') {
        if (!r.value.result.ok) {
          failures.push(`${r.value.email}: ${r.value.result.error}`);
        } else {
          successCount += 1;
        }
      } else {
        failures.push(`Unknown: ${r.reason instanceof Error ? r.reason.message : 'Invite failed'}`);
      }
    }
    dispatchStudent({ type: 'SUBMIT_END' });

    if (successCount > 0) {
      toast.success(
        studentFormMode === 'manual'
          ? `${successCount} student login${successCount > 1 ? 's' : ''} created.`
          : `${successCount} student invite${successCount > 1 ? 's' : ''} sent.`
      );
      setStudentRows([createStudentDraftRow()]);
      router.refresh();
    }
    if (failures.length > 0) {
      toast.error(failures[0] ?? 'Some invites failed.');
    }
  };

  const handleExcelFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
      const normalized: ImportedStudentRow[] = [];
      for (const row of rows) {
        const orig = row as Record<string, string | number | undefined>;
        const keyList = Object.keys(orig);
        const findKey = (patterns: RegExp[]) =>
          keyList.find((k) => patterns.some((p) => p.test(String(k).toLowerCase().trim())));
        const emailKey = findKey([/^e-?mail$/i, /email\s*address/i]) ?? keyList[1] ?? keyList[0];
        const nameKey = findKey([/full\s*name/i, /student\s*name/i, /^name$/i]) ?? keyList[0];
        const codeKey = findKey([/student\s*code/i, /^code$/i]);
        const getVal = (k: string) => {
          const v = orig[k];
          return typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : '';
        };
        const email = getVal(emailKey);
        const full_name = getVal(nameKey);
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          normalized.push({
            email,
            full_name: full_name || email,
            student_code: codeKey ? getVal(codeKey) || undefined : undefined,
          });
        }
      }
      dispatchStudent({ type: 'IMPORT_END', rows: normalized });
      if (normalized.length === 0) toast.error('No valid rows found.');
      else toast.success(`${normalized.length} row(s) extracted.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to parse Excel.');
    }
    event.target.value = '';
  };

  const handleSendImportedInvites = async () => {
    if (importedRows.length === 0) return;
    dispatchStudent({ type: 'IMPORT_START' });
    const result = await bulkInviteStudentsAction(collegeId, importedRows);
    if (!result.ok) {
      dispatchStudent({ type: 'IMPORT_END', rows: importedRows });
      toast.error(result.error);
      return;
    }
    const { invited, added, failed } = result;
    const hasSuccess = invited.length > 0 || added.length > 0;
    if (hasSuccess) {
      toast.success(`${added.length + invited.length} added/invited.`);
      dispatchStudent({ type: 'IMPORT_CLEAR' });
      router.refresh();
    } else {
      dispatchStudent({ type: 'IMPORT_END', rows: importedRows });
    }
    if (failed.length > 0 && !hasSuccess) toast.error(failed[0]?.reason ?? 'All failed.');
  };

  const addStudentRow = () => setStudentRows((prev) => [...prev, createStudentDraftRow()]);
  const removeStudentRow = (key: string) => {
    setStudentRows((prev) => {
      if (prev.length === 1) {
        return [{ ...prev[0], full_name: '', email: '', password: '' }];
      }
      return prev.filter((r) => r.key !== key);
    });
  };
  const updateStudentRow = (key: string, field: keyof StudentDraftRow, value: string) => 
    setStudentRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const handleUpdateStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!studentToEdit) return;
    dispatchStudent({ type: 'SUBMIT_START' });
    const formData = new FormData(event.currentTarget);
    formData.set('college_id', collegeId);
    formData.set('student_id', studentToEdit.id);
    const result = await updateStudentAction(formData);
    if (!result.ok) {
      dispatchStudent({ type: 'SUBMIT_END' });
      toast.error(result.error);
      return;
    }
    toast.success('Student updated.');
    dispatchStudent({ type: 'EDIT_CLOSE' });
    router.refresh();
  };

  const handleRemoveStudentFromCollege = async () => {
    if (!studentToRemoveFromCollege) return;
    dispatchStudent({ type: 'SUBMIT_START' });
    const formData = new FormData();
    formData.set('college_id', collegeId);
    formData.set('student_id', studentToRemoveFromCollege.id);
    const result = await removeStudentFromCollegeAction(formData);
    if (!result.ok) {
      dispatchStudent({ type: 'SUBMIT_END' });
      toast.error(result.error);
      return;
    }
    toast.success('Student removed from college.');
    dispatchStudent({ type: 'REMOVE_CLOSE' });
    router.refresh();
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    dispatchStudent({ type: 'SUBMIT_START' });
    const formData = new FormData();
    formData.set('college_id', collegeId);
    formData.set('student_id', studentToDelete.id);
    const result = await deleteStudentAction(formData);
    if (!result.ok) {
      dispatchStudent({ type: 'SUBMIT_END' });
      toast.error(result.error);
      return;
    }
    toast.success('Student deleted.');
    dispatchStudent({ type: 'DELETE_CLOSE' });
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Student Intake</p>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant={studentFormMode === 'manual' ? 'default' : 'outline'} onClick={() => setStudentFormMode('manual')}>Manual Entry</Button>
                <Button type="button" size="sm" variant={studentFormMode === 'invite' ? 'default' : 'outline'} onClick={() => setStudentFormMode('invite')}>Invite Entry</Button>
                <Button type="button" size="sm" variant={studentFormMode === 'import' ? 'default' : 'outline'} onClick={() => setStudentFormMode('import')}>Import Excel</Button>
              </div>
            </div>

            {studentFormMode === 'manual' || studentFormMode === 'invite' ? (
              <form onSubmit={handleBulkStudentCreate} className="space-y-3">
                {cohorts.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 rounded-lg border p-3 md:grid-cols-12">
                    <p className="text-sm font-medium md:col-span-3">Cohort / Section</p>
                    <Select
                      value={selectedCohortId ?? ''}
                      onValueChange={(v) => setSelectedCohortId(v || null)}
                    >
                      <SelectTrigger className="md:col-span-9">
                        <SelectValue placeholder="No cohort" />
                      </SelectTrigger>
                      <SelectContent>
                        {cohorts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  {studentRows.map((row) => (
                    <div key={row.key} className="grid grid-cols-1 gap-2 rounded-lg border p-2 md:grid-cols-12">
                      <Input value={row.full_name} onChange={(e) => updateStudentRow(row.key, 'full_name', e.target.value)} placeholder="Full name" className="md:col-span-3" required />
                      <Input type="email" value={row.email} onChange={(e) => updateStudentRow(row.key, 'email', e.target.value)} placeholder="student@college.edu" className="md:col-span-4" required />
                      {studentFormMode === 'manual' ? (
                        <Input type="password" value={row.password} onChange={(e) => updateStudentRow(row.key, 'password', e.target.value)} placeholder="Password" minLength={8} className="md:col-span-4" required />
                      ) : (
                        <div className="md:col-span-4 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                          Invite email will set password
                        </div>
                      )}
                      <Button type="button" variant="outline" size="sm" className="md:col-span-1" onClick={() => removeStudentRow(row.key)}>X</Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={addStudentRow}>Add Row</Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? (studentFormMode === 'manual' ? 'Creating...' : 'Sending...') : (studentFormMode === 'manual' ? 'Create' : 'Send Invites')}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <label htmlFor="excel-file" className="flex cursor-pointer items-center gap-2">
                  <input id="excel-file" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelFile} />
                  <Button type="button" variant="outline" asChild><span>Upload Excel</span></Button>
                </label>
                {importedRows.length > 0 && (
                  <Button type="button" onClick={handleSendImportedInvites} disabled={importSending}>
                    {importSending ? 'Sending...' : `Send invites (${importedRows.length})`}
                  </Button>
                )}
              </div>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Code</TableHead>
                <TableHead className="w-[280px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No students yet.</TableCell></TableRow>
              ) : (
                students.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell>{st.full_name ?? '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{st.email ?? '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{st.student_code ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => dispatchStudent({ type: 'EDIT_OPEN', student: st })} disabled={pending}>Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => dispatchStudent({ type: 'REMOVE_OPEN', student: st })} disabled={pending}>Remove from college</Button>
                        <Button size="sm" variant="destructive" onClick={() => dispatchStudent({ type: 'DELETE_OPEN', student: st })} disabled={pending}>Delete account</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!studentToEdit} onOpenChange={(open) => !open && dispatchStudent({ type: 'EDIT_CLOSE' })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          {studentToEdit && (
            <form onSubmit={handleUpdateStudent} className="space-y-3">
              <Input name="full_name" required defaultValue={studentToEdit.full_name ?? ''} placeholder="Full name" />
              <Input name="email" type="email" required defaultValue={studentToEdit.email ?? ''} placeholder="student@college.edu" />
              <Input name="student_code" defaultValue={studentToEdit.student_code ?? ''} placeholder="Student code" />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => dispatchStudent({ type: 'EDIT_CLOSE' })}>Cancel</Button>
                <Button type="submit" disabled={pending}>Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog
        open={!!studentToRemoveFromCollege}
        onClose={() => dispatchStudent({ type: 'REMOVE_CLOSE' })}
        title="Remove from college"
        description="Remove this student from the college only? Their login account stays active; financial records are retained."
        confirmLabel={pending ? 'Removing...' : 'Remove from college'}
        onConfirm={handleRemoveStudentFromCollege}
      />

      <ConfirmDialog
        open={!!studentToDelete}
        onClose={() => dispatchStudent({ type: 'DELETE_CLOSE' })}
        title="Delete account"
        description="Permanently delete this student login account? Financial invoices and note payment orders are retained."
        confirmLabel={pending ? 'Deleting...' : 'Delete account'}
        onConfirm={handleDeleteStudent}
      />
    </>
  );
}

function CollegeStatusSelect({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name="status" value={value} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}

