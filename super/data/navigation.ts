import type { LucideIcon } from 'lucide-react';
import {
    LayoutDashboard, Building2, GraduationCap,
    Briefcase, BookOpen, BookOpenCheck, Layers, Package, FileText,
    Users, ScrollText,
    UserPlus,
    PlayCircle,
    ShoppingCart, CreditCard as CreditCardIcon, TrendingUp, Tags,
    Mail, IndianRupee, BriefcaseBusiness, Video, Megaphone,
    StickyNote, Link, SlidersHorizontal,
} from 'lucide-react';



export type PageId =
    | 'dashboard' | 'colleges' | 'students'
    | 'placements' | 'jobs'
    | 'master-courses' | 'free-courses' | 'bootcamps' | 'course-pricing' | 'variants' | 'bundles' | 'assignments'
    | 'users' | 'audit'
    | 'college-leads'
    | 'commerce-orders' | 'commerce-payments' | 'commerce-revenue' | 'commerce-coupons' | 'campus-ambassadors'
    | 'email-center' | 'learning-analytics' | 'mentorship'
    | 'tpstreams'
    | 'announcements'
    | 'sheets'
    | 'notes'
    | 'resources'
    | 'team'
    | 'platform-settings';

const PAGE_IDS: PageId[] = [
    'dashboard', 'colleges', 'students', 'placements', 'jobs',
    'master-courses', 'free-courses', 'bootcamps', 'course-pricing', 'variants', 'bundles', 'assignments',
    'users', 'audit',
    'college-leads',
    'commerce-orders', 'commerce-payments', 'commerce-revenue', 'commerce-coupons', 'campus-ambassadors',
    'email-center', 'learning-analytics', 'mentorship',
    'tpstreams',
    'announcements',
    'sheets',
    'notes',
    'resources',
    'team',
    'platform-settings',
];

export function getPageIdFromPath(pathname: string): PageId {
    const normalized = pathname.replace(/^\//, '');
    if (normalized.startsWith('learning-analytics')) return 'learning-analytics';
    if (normalized.startsWith('commerce/orders')) return 'commerce-orders';
    if (normalized.startsWith('commerce/payments')) return 'commerce-payments';
    if (normalized.startsWith('commerce/revenue')) return 'commerce-revenue';
    if (normalized.startsWith('commerce/coupons')) return 'commerce-coupons';
    if (normalized.startsWith('jobs')) return 'jobs';
    if (normalized.startsWith('team')) return 'team';

    const segment = normalized.split('/')[0] || 'dashboard';
    return PAGE_IDS.includes(segment as PageId) ? (segment as PageId) : 'dashboard';
}

export function getPathFromPageId(id: PageId): string {
    // Explicit mapping for special cases with nested routes
    switch (id) {
        case 'commerce-orders': return '/commerce/orders';
        case 'commerce-payments': return '/commerce/payments';
        case 'commerce-revenue': return '/commerce/revenue';
        case 'commerce-coupons': return '/commerce/coupons';
        case 'campus-ambassadors': return '/commerce/campus-ambassadors';
        case 'email-center': return '/email-center';
        default: return `/${id}`;
    }
}

export interface NavItem {
    id: PageId;
    label: string;
    sub: string;
    icon: LucideIcon;
    badge?: string;
    badgeVariant?: 'default' | 'primary';
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export const navigation: NavGroup[] = [
    {
        title: 'Getting Started',
        items: [
            { id: 'dashboard', label: 'Dashboard', sub: 'Ops overview & KPIs', icon: LayoutDashboard },
            {
                id: 'learning-analytics',
                label: 'Learning Analytics',
                sub: 'Video watch time & completion',
                icon: PlayCircle,
            },
        ],
    },
    {
        title: 'College Management',
        items: [
            { id: 'college-leads', label: 'College Leads', sub: 'Contact requests & demos', icon: UserPlus },
            { id: 'colleges', label: 'Partner Colleges', sub: 'Tenants, admins, plans', icon: Building2 },
            { id: 'students', label: 'Students', sub: 'Users, activity, cohorts', icon: GraduationCap },
            { id: 'placements', label: 'Placements', sub: 'Claims, proof, outcomes', icon: Briefcase },
            { id: 'jobs', label: 'Jobs', sub: 'Job postings & applications', icon: BriefcaseBusiness },
        ],
    },
    {
        title: 'Content',
        items: [
            { id: 'master-courses', label: 'Master Courses', sub: 'Global source content', icon: BookOpen },
            { id: 'bootcamps', label: 'Paid Course Builder', sub: 'Standalone paid courses', icon: GraduationCap },
            { id: 'mentorship', label: 'Mentorship', sub: 'Job Ready Bootcamp sessions', icon: Users },
            { id: 'free-courses', label: 'Free Courses', sub: 'Curated YouTube & premium free content', icon: BookOpenCheck },
            { id: 'course-pricing', label: 'Course Pricing', sub: 'Global student pricing', icon: IndianRupee },
            { id: 'variants', label: 'Variants', sub: 'Customized courses', icon: Layers },
            { id: 'bundles', label: 'Bundles', sub: 'Course collections', icon: Package },
            { id: 'assignments', label: 'Assignments', sub: 'Tasks & submissions', icon: FileText },
            { id: 'announcements', label: 'Announcements', sub: 'Global banner & promotions', icon: Megaphone },
            { id: 'sheets', label: 'Sheets', sub: 'Manage DSA pattern sheet', icon: BookOpenCheck },
            { id: 'notes', label: 'Notes Library', sub: 'Handwritten & scanned notes', icon: StickyNote },
            { id: 'resources', label: 'Resources', sub: 'Course resource sections & items', icon: Link },
            { id: 'team', label: 'Team', sub: 'Public team page profiles', icon: Users },
        ],
    },
    {
        title: 'Commerce',
        items: [
            { id: 'commerce-orders', label: 'Orders', sub: 'Order management & tracking', icon: ShoppingCart },
            { id: 'commerce-payments', label: 'Payments', sub: 'Payment transactions', icon: CreditCardIcon },
            { id: 'commerce-revenue', label: 'Revenue', sub: 'Revenue analytics & trends', icon: TrendingUp },
            { id: 'commerce-coupons', label: 'Coupons', sub: 'Discount code management', icon: Tags },
            { id: 'campus-ambassadors', label: 'Campus Ambassadors', sub: 'CA program, payouts & analytics', icon: Users },
        ],
    },
    {
        title: 'System',
        items: [
            { id: 'users', label: 'Users & Roles', sub: 'RBAC permissions', icon: Users },
            { id: 'audit', label: 'Audit Logs', sub: 'Who changed what', icon: ScrollText },
            { id: 'email-center', label: 'Email Center', sub: 'Campaigns & templates', icon: Mail },
            { id: 'tpstreams', label: 'TPStreams', sub: 'Video infrastructure & monitoring', icon: Video },
            { id: 'platform-settings', label: 'Platform Settings', sub: 'Feature flags & platform-wide toggles', icon: SlidersHorizontal },
        ],
    },
];
