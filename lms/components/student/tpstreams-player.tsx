'use client';
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle, useContext, startTransition } from 'react';
import { useTpStreamsAnalytics } from './use-tpstreams-analytics';
import { PlayerErrorOverlay, ResumeOverlay, TabSwitchOverlay } from './tpstreams-overlays';
import { cn } from '@/lib/utils';
import type { VideoContentProtectionType } from '@/types/student-runtime';
import { PlaybackContext } from './course-player/context';

export interface TpStreamsPlayerRef {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => Promise<number>;
  togglePlay: () => void;
  isPlaying: () => boolean;
}

/** Max wait for TPStreams SDK / iframe before showing a timeout error (ms). */
const PLAYER_LOAD_TIMEOUT_MS = 45_000;

interface TpStreamsPlayerProps {
  collegeSlug: string;
  studentId: string;
  courseId: string;
  itemId: string;
  moduleId?: string;
  embedUrl: string;
  videoAssetId?: string;
  playbackToken?: string;
  /** From video_assets — DRM assets need Widevine (Chrome/Edge) or FairPlay (Safari). */
  contentProtectionType?: VideoContentProtectionType;
  initialPosition?: number;
  learnVariantId?: string | null;
  onComplete?: () => void;
  onRefresh?: () => void;
  onTimeUpdate?: (seconds: number, duration: number) => void;
  className?: string;
}

function playbackFailureMessage(protection: VideoContentProtectionType | undefined): string {
  if (protection === 'drm') {
    return (
      'This lesson uses DRM-protected video. Try Chrome or Edge (Widevine) on desktop, or Safari on Apple devices. ' +
      'Ensure you are on HTTPS. If it still fails, ask your admin to re-upload with AES encryption or protection disabled in TP Streams (see docs: AES vs DRM).'
    );
  }
  if (protection === 'aes') {
    return (
      'Video failed to load (AES-encrypted stream). Refresh the player or try another browser. ' +
      'If it persists, the access token may be expired—use Refresh Player—or check Network for blocked requests to TP Streams.'
    );
  }
  return (
    'Video failed to load. Try Refresh Player or check DevTools Network for blocked scripts and TP Streams responses.'
  );
}

// TPStreams Player SDK Types (player_v2.js — see tpstreams.md Player methods)
interface TpPlayerInstance {
  loaded: () => Promise<void>;
  getCurrentTime: () => Promise<number>;
  getDuration: () => Promise<number>;
  getWatchedTime: () => Promise<number>;
  getPaused: () => Promise<boolean>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  played: () => Promise<boolean>;
  setCurrentTime: (seconds: number) => void | Promise<void>;
  setPlayerUserId: (userId: string) => void;
  setCustomErrorMessage?: (
    messages: Record<string, string>,
  ) => void | Promise<void>;
  on: (event: string, callback: (data?: unknown) => void) => void;
  off: (event: string, callback: (data?: unknown) => void) => void;
}

declare global {
  interface Window {
    Testpress?: {
      Player: new (iframe: HTMLIFrameElement) => TpPlayerInstance;
    };
  }
}

function formatTpStreamsSdkError(data: unknown): string {
  if (data == null) {
    return '';
  }
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    const o = data as Record<string, unknown>;
    const msg = o.message ?? o.error ?? o.reason ?? o.code;
    if (typeof msg === 'string' && msg.length > 0) {
      return msg;
    }
    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }
  return String(data);
}

/**
 * Read the current playback time from the TPStreams player using
 * synchronous property access. Returns 0 if no valid time can be read.
 */
function readCurrentTimeSync(player: TpPlayerInstance): number {
  try {
    const p = player as unknown as Record<string, unknown>;
    if (typeof p.currentTime === 'number' && Number.isFinite(p.currentTime) && p.currentTime >= 0) {
      return p.currentTime;
    }
  } catch {
    // ignore
  }
  try {
    const p = player as unknown as Record<string, unknown>;
    const video = p.video as Record<string, unknown> | undefined;
    if (video && typeof video.currentTime === 'number' && Number.isFinite(video.currentTime) && video.currentTime >= 0) {
      return video.currentTime;
    }
  } catch {
    // ignore
  }
  return 0;
}

async function readCurrentTimeAsync(player: TpPlayerInstance): Promise<number> {
  try {
    const t = await player.getCurrentTime();
    if (typeof t === 'number' && Number.isFinite(t) && t >= 0) {
      return t;
    }
  } catch {
    // ignore — fall through to sync
  }
  const sync = readCurrentTimeSync(player);
  if (sync > 0) return sync;
  return 0;
}

export const TpStreamsPlayer = forwardRef<TpStreamsPlayerRef, TpStreamsPlayerProps>(
  (
    {
      collegeSlug,
      studentId,
      courseId,
      itemId,
      moduleId,
      embedUrl,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      videoAssetId,
      playbackToken,
      contentProtectionType,
      initialPosition = 0,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      learnVariantId = null,
      onComplete,
      onRefresh,
      onTimeUpdate,
      className = '',
    },
    ref,
  ) => {
    const analytics = useTpStreamsAnalytics({
      collegeSlug,
      courseId,
      moduleId,
      lessonId: itemId,
      embedUrl,
      studentId,
      playbackToken,
      onComplete,
    });
    const coursePlayerCtx = useContext(PlaybackContext);
    const localHasLoadedAnyVideoRef = useRef(false);
    const hasLoadedAnyVideoRef = coursePlayerCtx?.hasLoadedAnyVideoRef ?? localHasLoadedAnyVideoRef;

    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showResume, setShowResume] = useState(false);
    const [showTabSwitchOverlay, setShowTabSwitchOverlay] = useState(false);
    const liveCurrentTimeRef = useRef(0);
    const liveDurationRef = useRef(0);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const playerRef = useRef<TpPlayerInstance | null>(null);
    const hasSeekedRef = useRef(false);
    /** Prevents double `new Testpress.Player` for the same lesson/embed (iframe + script onLoad). */
    const attachedInstanceKeyRef = useRef<string>('');
    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const durationCacheRef = useRef<number>(0);

    const instanceKey = `${itemId}|${embedUrl}`;
    const instanceKeyRef = useRef(instanceKey);

    const isLoadedRef = useRef(false);

    useEffect(() => {
      if (instanceKey !== instanceKeyRef.current) {
        if (playerRef.current) {
          playerRef.current = null;
        }
        attachedInstanceKeyRef.current = '';
        hasSeekedRef.current = false;
        durationCacheRef.current = 0;
        isLoadedRef.current = false;
        instanceKeyRef.current = instanceKey;
        startTransition(() => {
          if (!hasLoadedAnyVideoRef.current) {
            setIsLoaded(false);
          }
          setError(null);
          setShowResume(false);
          liveCurrentTimeRef.current = 0;
          liveDurationRef.current = 0;
        });
      }
    }, [instanceKey, hasLoadedAnyVideoRef]);

    const isPlayingRef = useRef(false);

    const playPlayer = useCallback(() => {
      const player = playerRef.current;
      if (!player) return;
      void player.play().catch((err: unknown) => {
        console.warn('[TpStreamsPlayer] player.play() failed:', err);
      });
    }, []);

    const pausePlayer = useCallback(() => {
      const player = playerRef.current;
      if (!player) return;
      void player.pause().catch((err: unknown) => {
        console.warn('[TpStreamsPlayer] player.pause() failed:', err);
      });
    }, []);

    // Track play/pause state and dismiss resume overlay on play
    useEffect(() => {
      if (!playerRef.current) return;
      const player = playerRef.current;
      const onPlay = () => {
        isPlayingRef.current = true;
        setShowResume(false);
      };
      const onPause = () => { isPlayingRef.current = false; };
      player.on('play', onPlay);
      player.on('pause', onPause);
      return () => {
        player.off('play', onPlay);
        player.off('pause', onPause);
      };
    }, [instanceKey]);

    // Tab switch detection — pause video when user leaves the tab or window
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && isPlayingRef.current) {
          pausePlayer();
          setShowTabSwitchOverlay(true);
        }
      };

      const handleWindowBlur = () => {
        if (isPlayingRef.current) {
          pausePlayer();
          setShowTabSwitchOverlay(true);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleWindowBlur);
      };
    }, [pausePlayer]);

    // Auto-dismiss tab switch overlay when tab becomes visible again
    useEffect(() => {
      const handleVisibilityRestore = () => {
        if (document.visibilityState === 'visible' && showTabSwitchOverlay) {
          setShowTabSwitchOverlay(false);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityRestore);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityRestore);
      };
    }, [showTabSwitchOverlay]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (playerRef.current) {
          void Promise.resolve(playerRef.current.setCurrentTime(seconds)).catch((err: unknown) => {
            console.warn('[TpStreamsPlayer] setCurrentTime() failed:', err);
          });
        }
      },
      getCurrentTime: async () => {
        if (playerRef.current) {
          return await playerRef.current.getCurrentTime();
        }
        return 0;
      },
      togglePlay: () => {
        const player = playerRef.current;
        if (!player) return;
        void player.getPaused()
          .then((paused) => (paused ? player.play() : player.pause()))
          .catch(() => (isPlayingRef.current ? player.pause() : player.play()))
          .catch((err: unknown) => {
            console.warn('[TpStreamsPlayer] toggle playback failed:', err);
          });
      },
      isPlaying: () => isPlayingRef.current,
    }));

    // Format seconds to MM:SS
    const handleResume = useCallback(() => {
      if (playerRef.current && initialPosition > 0) {
        void Promise.resolve(playerRef.current.setCurrentTime(initialPosition)).catch((err: unknown) => {
          console.warn('[TpStreamsPlayer] resume seek failed:', err);
        });
        hasSeekedRef.current = true;
        setShowResume(false);
      }
    }, [initialPosition]);

    const handleTabSwitchResume = useCallback(() => {
      playPlayer();
      setShowTabSwitchOverlay(false);
    }, [playPlayer]);

    const applyResumePrompt = useCallback(() => {
      if (initialPosition > 10 && !hasSeekedRef.current) {
        setShowResume(true);
        setTimeout(() => setShowResume(false), 10000);
      }
    }, [initialPosition]);

    const analyticsRef = useRef(analytics);
    const onTimeUpdatePropRef = useRef(onTimeUpdate);

    useEffect(() => {
      analyticsRef.current = analytics;
    }, [analytics]);

    useEffect(() => {
      onTimeUpdatePropRef.current = onTimeUpdate;
    }, [onTimeUpdate]);

    const handlersRef = useRef({
      onPlay: analytics.onPlay,
      onPause: analytics.onPause,
      onTimeUpdate: analytics.onTimeUpdate,
      onSeek: analytics.onSeek,
      onRateChange: analytics.onRateChange,
      onEnded: analytics.onEnded,
      onTimeUpdateProp: onTimeUpdate,
    });

    useEffect(() => {
      handlersRef.current = {
        onPlay: analytics.onPlay,
        onPause: analytics.onPause,
        onTimeUpdate: analytics.onTimeUpdate,
        onSeek: analytics.onSeek,
        onRateChange: analytics.onRateChange,
        onEnded: analytics.onEnded,
        onTimeUpdateProp: onTimeUpdate,
      };
    }, [analytics, onTimeUpdate]);
    const initializeSDK = useCallback(() => {
      if (!iframeRef.current || !window.Testpress?.Player) return;
      const keyNow = instanceKeyRef.current;
      if (attachedInstanceKeyRef.current === keyNow && playerRef.current) {
        return;
      }
      try {
        const player = new window.Testpress.Player(iframeRef.current);
        if (instanceKeyRef.current !== keyNow) return;
        attachedInstanceKeyRef.current = keyNow;
        playerRef.current = player;
        // Note: setPlayerUserId is not called so LMS progress remains the canonical resume source.

        // Doc: setCustomErrorMessage — surface DRM/browser failures clearly in the iframe.
        if (typeof player.setCustomErrorMessage === 'function') {
          void Promise.resolve(
            player.setCustomErrorMessage({
              BrowserNotSupported: 'This browser is not supported for video playback.',
              DRMKeySystemUnsupported:
                'DRM is not supported in this browser. Try Chrome or Edge (Widevine), or Safari on Apple devices.',
              NetworkNotAvailable:
                'A network error occurred. Please check your internet connection.',
              DefaultPlaybackError:
                'Playback failed. Use Refresh Player, or try again in a supported browser.',
            }),
          ).catch(() => {
            // Older player_v2 builds may reject; LMS overlay still handles errors.
          });
        }

        // Primary readiness path per TPStreams docs (player.loaded() promise).
        void player
          .loaded()
          .then(async () => {
            if (instanceKeyRef.current !== keyNow) return;
            setIsLoaded(true);
            isLoadedRef.current = true;
            hasLoadedAnyVideoRef.current = true;
            applyResumePrompt();
            try {
              const rawDuration = await player.getDuration();
              const duration = typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration >= 0 ? rawDuration : 0;
              durationCacheRef.current = duration;
              liveDurationRef.current = duration;
              void analyticsRef.current.startSession(duration);
            } catch {
              void analyticsRef.current.startSession(0);
            }
          })
          .catch((err: unknown) => {
            console.error('[TpStreamsPlayer] player.loaded() rejected:', err);
            if (instanceKeyRef.current === keyNow) {
              setError(playbackFailureMessage(contentProtectionType));
            }
          });

        player.on('play', () => {
          analyticsRef.current.onPlay();
        });

        player.on('timeupdate', async () => {
          const [currentTime, rawDuration] = await Promise.all([
            readCurrentTimeAsync(player),
            durationCacheRef.current > 0 ? Promise.resolve(durationCacheRef.current) : player.getDuration().catch(() => 0),
          ]);
          const duration = typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration >= 0 ? rawDuration : 0;
          if (duration > 0 && durationCacheRef.current === 0) {
            durationCacheRef.current = duration;
            liveDurationRef.current = duration;
          }
          liveCurrentTimeRef.current = currentTime;
          onTimeUpdatePropRef.current?.(currentTime, duration);
          analyticsRef.current.onTimeUpdate(currentTime, duration);
        });

        player.on('pause', () => {
          analyticsRef.current.onPause();
        });

        player.on('seeked', () => {
          analyticsRef.current.onSeek();
        });

        player.on('ratechange', (data?: unknown) => {
          let rate: number | null = null;
          // Walk the payload to find a numeric rate between 0.5 and 2.0
          const findRate = (v: unknown, depth: number): number | null => {
            if (depth > 4 || v == null) return null;
            if (typeof v === 'number' && Number.isFinite(v) && v >= 0.5 && v <= 2.0) {
              return v;
            }
            if (typeof v === 'object') {
              const obj = v as Record<string, unknown>;
              const named = obj.playbackRate ?? obj.rate ?? obj.speed ?? obj.value;
              if (typeof named === 'number' && Number.isFinite(named) && named >= 0.5 && named <= 2.0) {
                return named;
              }
              for (const key of Object.keys(obj)) {
                const found = findRate(obj[key], depth + 1);
                if (found != null) return found;
              }
            }
            return null;
          };

          rate = findRate(data, 0);

          // Fallback: if payload didn't carry a usable rate, read it
          // directly from the underlying <video> element. This is the
          // most reliable source for the *current* playback rate.
          if (rate == null) {
            try {
              const p = player as unknown as Record<string, unknown>;
              const video = p.video as Record<string, unknown> | undefined;
              const direct = video?.playbackRate as unknown;
              if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
                rate = direct;
              }
            } catch {
              // ignore
            }
          }

          // Last-resort default. If we still have nothing, DON'T call
          // onRateChange (which would close the current segment and
          // restart it with rate=1.0, corrupting the 2x analytics).
          if (rate == null) {
            console.warn(
              '[TpStreamsPlayer] ratechange fired but rate could not be resolved; ignoring to avoid corrupting analytics.',
              data,
            );
            return;
          }

          analyticsRef.current.onRateChange(rate);
        });

        player.on('ended', () => {
          analyticsRef.current.onEnded();
        });

        player.on('error', (data?: unknown) => {
          const detail = formatTpStreamsSdkError(data);
          if (detail) {
            console.error('[TpStreamsPlayer] SDK error:', detail);
          } else {
            console.warn(
              '[TpStreamsPlayer] SDK emitted error with no payload (TPStreams player_v2 quirk; playback may still recover).',
            );
          }
          setError(
            contentProtectionType === 'drm'
              ? playbackFailureMessage('drm')
              : 'Playback session expired or video unavailable.',
          );
        });
      } catch (err) {
        console.error('[TpStreamsPlayer] Init failed:', err);
        setError('Failed to initialize video player.');
      }
    }, [contentProtectionType, applyResumePrompt, hasLoadedAnyVideoRef]);

    // Fail closed if neither loaded() nor error fires (blocked script, transcoding hang, etc.).
    useEffect(() => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      loadTimeoutRef.current = setTimeout(() => {
        if (!isLoadedRef.current) {
          setError(
            contentProtectionType === 'drm'
              ? `${playbackFailureMessage('drm')} Also confirm the player iframe is not blocked and Widevine is updated (Chrome: chrome://components).`
              : 'The player is taking too long to start. Check Network for player_v2.js and m3u8 requests, ad blockers, or TPStreams asset status.',
          );
        }
      }, PLAYER_LOAD_TIMEOUT_MS);
      return () => {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
      };
    }, [instanceKey, contentProtectionType]);

    useEffect(() => {
      if (!isLoaded) return;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    }, [isLoaded]);

    useEffect(() => {
      if (!error) return;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    }, [error]);

    // DevTools hint: log embed path without exposing the access token.
    useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        try {
          const u = new URL(embedUrl);
          console.debug(
            '[TpStreamsPlayer] embed path (no token):',
            `${u.origin}${u.pathname}`,
            '— check Network: player_v2.js, iframe document, HLS segments',
          );
        } catch {
          console.debug('[TpStreamsPlayer] embed URL parse failed');
        }
      }
    }, [embedUrl]);

    // Cleanup — only player-specific state; analytics session cleanup is handled by the hook
    useEffect(() => {
      return () => {
        liveDurationRef.current = 0;
        durationCacheRef.current = 0;
        hasSeekedRef.current = false;
      };
    }, [itemId]);

    // Robust script check/initialization hook
    useEffect(() => {
      if (window.Testpress?.Player) {
        queueMicrotask(() => initializeSDK());
      } else {
        const interval = setInterval(() => {
          if (window.Testpress?.Player) {
            queueMicrotask(() => initializeSDK());
            clearInterval(interval);
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }, [initializeSDK]);

    return (
      <div className={cn('relative aspect-video w-full overflow-hidden bg-black group', className)}>
        {/* Do not display the 'Initializing player' overlay to prevent a bad loading experience */}
        {error ? <PlayerErrorOverlay error={error} onRefresh={onRefresh} /> : null}
        {isLoaded && showResume ? (
          <ResumeOverlay
            initialPosition={initialPosition}
            onResume={handleResume}
            onDismiss={() => setShowResume(false)}
          />
        ) : null}
        {isLoaded && showTabSwitchOverlay ? (
          <TabSwitchOverlay onResume={handleTabSwitchResume} />
        ) : null}
        <iframe
          id="tp-streams-iframe-shared"
          title="TP Streams video lesson"
          ref={iframeRef}
          src={embedUrl}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          onLoad={initializeSDK}
        />
      </div>
    );
  },
);

TpStreamsPlayer.displayName = 'TpStreamsPlayer';

