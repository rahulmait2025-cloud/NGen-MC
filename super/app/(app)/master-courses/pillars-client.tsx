'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Layers, 
  Video, 
  Search, 
  Plus, 
  ChevronRight,
  FolderOpen,
  AlertCircle,
  Clock,
  ArchiveX,
  AlertTriangle,
  RefreshCw,
  Users
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreatePillarDialog } from '@/components/master-courses/create-pillar-dialog';
import { SyncTpStreamsButton } from '@/components/master-courses/sync-tpstreams-button';
import { EnsureCorePillarsButton } from '@/components/master-courses/ensure-core-pillars-button';
import { PillarCardActions } from '@/components/master-courses/pillar-card-actions';
import { ForceDeleteTpstreamsAssetAction } from '@/components/master-courses/force-delete-tpstreams-asset-action';
import { RepairFolderLocationAction } from '@/components/master-courses/repair-folder-location-action';
import { AssignPillarDialog } from '@/components/master-courses/assign-pillar-dialog';
import type { listMasterCoursePillars } from '@/lib/services/master-course-pillars';
import type { getPillarDeleteImpact } from '@/lib/services/master-course-delete';
import type { ReflectedFolder } from '@/lib/services/tpstreams-sync';

const EMPTY_UNMATCHED_FOLDERS: ReflectedFolder[] = [];

interface PillarsClientProps {
  initialPillars: Awaited<ReturnType<typeof listMasterCoursePillars>>;
  pillarImpacts: Record<string, Awaited<ReturnType<typeof getPillarDeleteImpact>>>;
  unmatchedFolders?: ReflectedFolder[];
}

function DiscoveredFolderCard({ folder }: { folder: ReflectedFolder }) {
  const isOrphan = folder.classification === 'orphan';
  const isMisplaced = folder.is_misplaced;

  return (
    <Card className={`group relative flex flex-col h-full bg-card border-primary/20 card-tier-1 card-hover-lift transition-[box-shadow,border-color,ring-color] duration-200 overflow-hidden ${isMisplaced ? 'ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : ''}`}>
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col gap-1">
            <Badge 
              className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 border ${
                isOrphan 
                  ? 'bg-primary/10 text-primary border-primary/20' 
                  : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10'
              }`}
            >
              {isOrphan ? 'Unlinked Folder' : `Linked ${folder.linked_entity_type}`}
            </Badge>
            {isMisplaced && (
              <Badge className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 border bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10">
                Misplaced
              </Badge>
            )}
          </div>
          <ForceDeleteTpstreamsAssetAction folder={folder} />
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold transition-colors line-clamp-1 group-hover:text-primary">
            {folder.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
            {isOrphan 
              ? "This folder exists in TPStreams but is not yet imported as a Pillar."
              : `This folder is linked to ${folder.linked_entity_type}: "${folder.linked_entity_title}".`
            }
          </p>
        </div>

        <div className="mt-auto pt-4 space-y-3 border-t border-border/50">
          <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[10px] font-mono text-primary/60 break-all">
              ID: {folder.tp_folder_uuid}
            </p>
          </div>
          
          {isOrphan ? (
            <CreatePillarDialog 
              initialValues={{
                title: folder.title,
                tp_folder_uuid: folder.tp_folder_uuid
              }}
              trigger={
                <Button 
                  variant="outline" 
                  className="w-full group/btn hover:bg-primary hover:text-primary-foreground border-primary/20 transition-[background-color,color,transform] duration-160 active:scale-[0.98]"
                >
                  Import as Pillar
                  <ChevronRight className="size-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              }
            />
          ) : isMisplaced ? (
            <RepairFolderLocationAction folder={folder} />
          ) : (
             <Button 
               variant="ghost" 
               disabled 
               className="w-full text-muted-foreground cursor-not-allowed italic"
             >
               Properly Placed
             </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LegacyBadge() {
  return (
    <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10">
      <ArchiveX className="size-3 mr-1" />
      Legacy
    </Badge>
  );
}

const PILLAR_STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10',
  unpublished: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10',
};

const PILLAR_STATUS_LABELS: Record<string, string> = {
  published: 'Published',
  unpublished: 'Unpublished',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 border ${PILLAR_STATUS_STYLES[status] || 'bg-muted text-muted-foreground border-border'}`}>
      {PILLAR_STATUS_LABELS[status] || 'Draft'}
    </Badge>
  );
}

function SyncBadge({ status, error }: { status: string; error: string | null }) {
  if (status === 'created') {
    return (
      <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">
        <FolderOpen className="size-3 mr-1" />
        Synced
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border text-red-600 bg-red-500/10 border-red-500/20" title={error ?? 'Sync failed'}>
        <AlertCircle className="size-3 mr-1" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border text-muted-foreground">
      <Clock className="size-3 mr-1" />
      Pending
    </Badge>
  );
}

function PillarGridCard({ 
  pillar, 
  deleteImpact 
}: { 
  pillar: PillarsClientProps['initialPillars'][number];
  deleteImpact: Awaited<ReturnType<typeof getPillarDeleteImpact>>;
}) {
  const isUncategorized = pillar.code === 'uncategorized' || pillar.slug === 'uncategorized';

  return (
    <Card className="group relative flex flex-col h-full bg-card border-border/50 hover:border-primary/30 card-tier-1 card-hover-lift transition-[box-shadow,border-color] duration-200 overflow-hidden">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={pillar.publish_status} />
            {isUncategorized && <LegacyBadge />}
            <SyncBadge status={pillar.tp_folder_status} error={pillar.tp_last_error} />
          </div>
          <div className="z-10">
            <PillarCardActions pillar={pillar} deleteImpact={deleteImpact} />
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold transition-colors line-clamp-1 group-hover:text-primary">
            {pillar.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
            {pillar.short_description || pillar.description || "No description provided."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-auto pt-4 border-t border-border/50">
          <div className="flex flex-col items-center p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
            <BookOpen className="size-4 text-primary/60 mb-1" />
            <span className="text-sm font-semibold">{pillar.course_count}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Courses</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
            <Layers className="size-4 text-primary/60 mb-1" />
            <span className="text-sm font-semibold">{pillar.module_count}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Modules</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
            <Video className="size-4 text-primary/60 mb-1" />
            <span className="text-sm font-semibold">{pillar.video_count}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Videos</span>
          </div>
        </div>

        {pillar.tp_last_synced_at && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground/70 px-1">
            <RefreshCw className="size-2.5" />
            <span suppressHydrationWarning>Synced {new Date(pillar.tp_last_synced_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
        )}


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          <Button 
            asChild 
            variant="outline" 
            className="w-full group/btn hover:bg-primary hover:text-primary-foreground border-primary/20 transition-[transform,background-color,color,box-shadow] duration-200"
            onClick={() => toast.info(`Opening ${pillar.title} details...`)}
          >
            <Link href={`/master-courses/pillars/${pillar.pillar_id}`}>
              View
              <ChevronRight className="size-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <AssignPillarDialog 
            pillarId={pillar.pillar_id} 
            pillarTitle={pillar.title}
            trigger={
              <Button 
                variant="outline" 
                className="w-full group/btn hover:bg-emerald-500 hover:text-white border-emerald-500/20 transition-[background-color,color,transform] duration-160 active:scale-[0.98] gap-1.5"
                onClick={() => toast.info(`Assigning colleges to ${pillar.title}...`)}
              >
                <Users className="size-4" />
                Assign
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AddPillarCard() {
  return (
    <div className="h-full">
      <CreatePillarDialog 
        trigger={
          <button type="button" className="w-full h-full min-h-[280px] flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-[border-color,background-color] duration-200 group card-tier-1">
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Plus className="size-8 text-primary [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-110 transition-transform ease-[var(--ease-out)]" />
            </div>
            <div className="text-center px-6">
              <span className="block font-semibold text-lg text-foreground group-hover:text-primary transition-colors">Create New Pillar</span>
              <p className="text-xs text-muted-foreground mt-1">Organize your courses into a new high-level category</p>
            </div>
          </button>
        }
      />
    </div>
  );
}

export function PillarsClient({ initialPillars, pillarImpacts, unmatchedFolders: initialUnmatchedFolders = EMPTY_UNMATCHED_FOLDERS }: PillarsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnlinked, setShowUnlinked] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [syncFolders, setSyncFolders] = useState<ReflectedFolder[] | null>(null);
  const unmatchedFolders = syncFolders ?? initialUnmatchedFolders;

  const filteredPillars = initialPillars.filter(pillar => {
    const isDeleted = pillar.publish_status === 'unpublished' && !pillar.tp_folder_uuid;
    if (isDeleted && !showDeleted) return false;

    const matchesSearch = pillar.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pillar.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredUnmatched = unmatchedFolders.filter(folder =>
    folder.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasUnlinked = unmatchedFolders.length > 0;

  const handleSyncComplete = (folders: ReflectedFolder[] | undefined) => {
    const validFolders = folders || [];
    setSyncFolders(validFolders);
    if (validFolders.length > 0) {
      setShowUnlinked(true);
    } else {
      setShowUnlinked(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 flex-1 max-w-2xl min-w-0">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search pillars..." 
              className="pl-9 bg-card border-border/50 focus-visible:ring-primary shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {hasUnlinked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnlinked(!showUnlinked)}
              className={`transition-[background-color,border-color,color] duration-160 ${showUnlinked ? 'bg-primary/10 border-primary text-primary' : 'border-primary/20 text-muted-foreground'}`}
            >
              <AlertTriangle className="size-4 mr-2" />
              {showUnlinked ? 'Hide' : 'Show'} Unlinked ({unmatchedFolders.length})
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleted(!showDeleted)}
            className={`transition-[color,font-weight] duration-160 text-xs ${showDeleted ? 'text-primary font-bold' : 'text-muted-foreground'}`}
          >
            {showDeleted ? 'Hide' : 'Show'} Deleted Pillars
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <EnsureCorePillarsButton />
          <SyncTpStreamsButton onSyncComplete={handleSyncComplete} />
          <CreatePillarDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPillars.map((pillar) => (
          <PillarGridCard 
            key={pillar.pillar_id} 
            pillar={pillar} 
            deleteImpact={pillarImpacts[pillar.pillar_id]} 
          />
        ))}

        {(showUnlinked || searchQuery) && filteredUnmatched.map((folder) => (
          <DiscoveredFolderCard 
            key={folder.tp_folder_uuid} 
            folder={folder} 
          />
        ))}
        
        <AddPillarCard />
      </div>

      {filteredPillars.length === 0 && (!showUnlinked || filteredUnmatched.length === 0) && searchQuery && (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground">No pillars found matching &quot;{searchQuery}&quot;</p>
          <Button 
            variant="link" 
            onClick={() => setSearchQuery('')}
            className="text-violet-600"
          >
            Clear Search
          </Button>
        </div>
      )}
    </div>
  );
}
