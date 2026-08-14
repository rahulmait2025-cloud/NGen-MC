import 'server-only';

/**
 * TPStreams shared type definitions.
 *
 * These are derived directly from the TPStreams API documentation.
 * All types are readonly to prevent accidental mutation of API responses.
 *
 * Versioning: TPStreams API v1 (as of 2025-04).
 */

// ─── Common pagination wrapper ────────────────────────────────────────────────

export interface TpPaginatedResponse<T> {
  readonly count: number;
  readonly next: string | null;
  readonly previous: string | null;
  readonly results: ReadonlyArray<T>;
}

// ─── Organisation ─────────────────────────────────────────────────────────────

export interface TpOrganisation {
  readonly name: string;
  readonly uuid: string;
  readonly drm_aes_signing_iv: string;
  readonly drm_aes_signing_key: string;
}

// ─── Video / Asset shared types ───────────────────────────────────────────────

export type TpVideoResolution = '240p' | '360p' | '480p' | '540p' | '720p' | '1080p';
export type TpContentProtectionType = 'drm' | 'aes' | 'disable';
export type TpVideoStatus =
  | 'Not Started'
  | 'Queued'
  | 'Processing'
  | 'Completed'
  | 'Error';
export type TpAssetType = 'video' | 'livestream' | 'folder';

export interface TpVideoInput {
  readonly url: string;
}

export interface TpPreviewThumbnail {
  readonly url: string;
  readonly interval: number;
  readonly width: number;
  readonly height: number;
  readonly rows: number;
  readonly columns: number;
}

export interface TpTrack {
  readonly id: number;
  readonly type: string;
  readonly preview_thumbnail?: TpPreviewThumbnail;
}

export interface TpOutputUrls {
  readonly [codec: string]: {
    readonly hls_url: string;
    readonly dash_url: string;
  };
}

export interface TpVideoDetail {
  readonly progress: number;
  readonly thumbnails: ReadonlyArray<string> | null;
  readonly status: TpVideoStatus;
  readonly playback_url: string;
  readonly dash_url: string;
  readonly preview_thumbnail_url: string | null;
  readonly cover_thumbnail_url: string | null;
  readonly format: string;
  readonly resolutions: ReadonlyArray<TpVideoResolution>;
  readonly video_codec: string;
  readonly audio_codec: string;
  readonly enable_drm: boolean;
  readonly tracks: ReadonlyArray<TpTrack>;
  readonly inputs: ReadonlyArray<TpVideoInput>;
  readonly transmux_only: boolean | null;
  readonly duration: number | null;
  readonly content_protection_type: TpContentProtectionType;
  readonly generate_subtitle?: boolean;
  readonly video_codecs?: ReadonlyArray<string>;
  readonly output_urls?: TpOutputUrls;
}

export interface TpAssetParent {
  readonly title: string;
  readonly uuid: string;
}

/** Base asset shape returned by list/detail endpoints. */
export interface TpAsset {
  readonly id: string;
  readonly title: string;
  readonly bytes: number | null;
  readonly type: TpAssetType;
  readonly video: TpVideoDetail | null;
  readonly live_stream: TpLiveStreamDetail | null;
  readonly parent: TpAssetParent | null;
  readonly parent_id: string | null;
}

/** Asset detail includes analytics fields (only on /assets/<id>/ endpoint). */
export interface TpAssetDetail extends TpAsset {
  readonly views_count?: number;
  readonly average_watched_time?: number;
  readonly total_watch_time?: number;
  readonly unique_viewers_count?: number;
  readonly download_url?: string;
}

// ─── Folder ───────────────────────────────────────────────────────────────────

export interface TpFolder {
  readonly title: string;
  readonly uuid: string;
}

export interface TpCreateFolderRequest {
  /** Required. Name of the folder. */
  title: string;
  /** Optional. UUID of the parent folder. */
  parent?: string;
}

// ─── Video upload ─────────────────────────────────────────────────────────────

export interface TpCreateVideoRequest {
  /** Required. Input URL(s) to ingest. */
  inputs: TpVideoInput[];
  /** Required. Target resolutions. */
  resolutions: TpVideoResolution[];
  /** Optional title. */
  title?: string;
  /** Optional content protection. */
  content_protection_type?: TpContentProtectionType;
  /** Optional folder UUID. */
  folder?: string;
  /** Optional. Auto-generate English subtitles after upload. */
  generate_subtitle?: boolean;
}

// ─── Move asset ───────────────────────────────────────────────────────────────

export interface TpMoveAssetRequest {
  /** Destination folder UUID. Omit to move to root. */
  parent?: string;
}

export interface TpMoveAssetResponse {
  readonly detail: string;
}

// ─── Subtitle upload ──────────────────────────────────────────────────────────

export interface TpUploadSubtitleResponse {
  readonly detail: string;
}

export interface TpUploadThumbnailResponse {
  readonly detail: string;
}

// ─── Trim ─────────────────────────────────────────────────────────────────────

export interface TpTrimRequest {
  /** Start time in seconds. At least one of start_time/end_time required. */
  start_time?: number;
  /** End time in seconds. */
  end_time?: number;
}

export interface TpTrimResponse {
  readonly message: string;
  readonly trim_job_id: number;
  readonly status: string;
}

export interface TpTrimStatusResponse {
  readonly id: number;
  readonly start_time: number;
  readonly end_time: number;
  readonly status: number;
  readonly status_display: string;
  readonly background_task_id: string;
  readonly created: string;
  readonly modified: string;
}

export interface TpTrimRevertResponse {
  readonly message: string;
  readonly task_id: string;
}

// ─── Access tokens ────────────────────────────────────────────────────────────

export interface TpAnnotation {
  readonly text: string;
  readonly type: 'dynamic' | 'static';
  readonly color: string;
  readonly opacity: string;
  readonly size: number;
  readonly interval?: number;
  readonly skip?: number;
  readonly x: number;
  readonly y: number;
}

export interface TpCreateAccessTokenRequest {
  /** Time-to-live in seconds. Omit for infinite lifetime. */
  time_to_live?: number;
  /** If true, token expires after first use. */
  expires_after_first_usage?: boolean;
  /** Watermark annotations. */
  annotations?: TpAnnotation[];
}

export interface TpUpdateAccessTokenRequest {
  /** New time-to-live in seconds. */
  time_to_live?: number;
}

export interface TpAccessToken {
  readonly playback_url: string;
  readonly expires_after_first_usage: boolean;
  readonly code: string;
  readonly status: 'Active' | 'Expired' | 'Used';
  readonly valid_until: string | null;
  readonly annotations: ReadonlyArray<TpAnnotation>;
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export interface TpCreateWebhookRequest {
  /** Callback URL. */
  url: string;
  /** Secret sent in x-streams-token header. */
  secret_token: string;
}

export interface TpUpdateWebhookRequest {
  url?: string;
  secret_token?: string;
}

export interface TpWebhook {
  readonly id: string;
  readonly url: string;
  readonly secret_token: string;
}

// ─── Chapters ─────────────────────────────────────────────────────────────────

export interface TpChapterInput {
  /** Chapter title. */
  title: string;
  /** HH:MM:SS timestamp within the video. */
  start_time: string;
}

export interface TpCreateChaptersRequest {
  chapters: TpChapterInput[];
}

export interface TpChapter {
  readonly id: number;
  readonly title: string;
  readonly start_time: string;
}

// ─── Live stream ──────────────────────────────────────────────────────────────

export type TpLiveStreamStatus =
  | 'Not Started'
  | 'Streaming'
  | 'Recording'
  | 'Disconnected'
  | 'Stopped'
  | 'Completed'
  | 'Error';

export interface TpLiveStreamActivity {
  readonly status: string;
  readonly timestamp: string;
}

export interface TpLiveStreamDetail {
  readonly rtmp_url: string;
  readonly stream_key: string | null;
  readonly status: TpLiveStreamStatus;
  readonly hls_url: string;
  readonly start: string;
  readonly transcode_recorded_video: boolean;
  readonly enable_drm_for_recording: boolean;
  readonly chat_embed_url: string | null;
  readonly resolutions: ReadonlyArray<TpVideoResolution>;
  readonly enable_drm: boolean;
  readonly enable_llhls?: boolean;
  readonly latency?: string;
  readonly activities?: ReadonlyArray<TpLiveStreamActivity>;
}

// ─── Asset list query params ──────────────────────────────────────────────────

export interface TpListAssetsParams {
  /** Pagination offset. */
  offset?: number;
  /** Page size limit. */
  limit?: number;
  /** Filter by folder UUID. */
  parent?: string;
  /** Search query. */
  q?: string;
}

export interface TpListFoldersParams {
  /** Search query (q param). */
  q?: string;
}

export interface TpGetAssetDetailParams {
  /** Playback URL expiry in seconds (for AES-encrypted videos). */
  expiry?: number;
}
