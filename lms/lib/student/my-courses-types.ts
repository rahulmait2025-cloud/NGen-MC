import type { EntitledCourseListItem } from '@/lib/services/student-courses';

export type YoutubeMyCourseRow = {
  id: string;
  title: string;
  short_description: string | null;
  thumbnail_url?: string | null;
  module_count: number;
  video_count: number;
  progress_percentage: number;
  progress_completed_items?: number;
  progress_total_items?: number;
  progress_completed_video_items?: number;
  progress_total_video_items?: number;
  access_label?: string | null;
  access_level?: 'full' | 'partial';
  is_youtube: true;
  playlist_id: string;
  learnHref?: string;
};

export type MyCourseRow = EntitledCourseListItem | YoutubeMyCourseRow;
