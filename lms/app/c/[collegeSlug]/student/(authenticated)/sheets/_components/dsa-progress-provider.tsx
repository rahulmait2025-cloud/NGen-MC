'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { toggleProgress, toggleFavorite } from '../actions';
import { toast } from 'sonner';

interface DsaProgressContextValue {
  completedProblemIds: Set<string>;
  favoritedProblemIds: Set<string>;
  toggleCompleted: (problemId: string) => void;
  toggleFavorited: (problemId: string) => void;
  studentId: string;
  collegeSlug: string;
}

const DsaProgressContext = createContext<DsaProgressContextValue | null>(null);

export function useDsaProgress() {
  const ctx = useContext(DsaProgressContext);
  if (!ctx) throw new Error('useDsaProgress must be used within DsaProgressProvider');
  return ctx;
}

interface Props {
  initialCompleted: string[];
  initialFavorited: string[];
  studentId: string;
  collegeSlug: string;
  children: React.ReactNode;
}

interface PendingToggle {
  initialVal: boolean;
  latestVal: boolean;
  timer: NodeJS.Timeout;
}

export function DsaProgressProvider({
  initialCompleted,
  initialFavorited,
  studentId,
  collegeSlug,
  children,
}: Props) {
  const [completedSet, setCompletedSet] = useState(
    () => new Set(initialCompleted)
  );
  const [favoritedSet, setFavoritedSet] = useState(
    () => new Set(initialFavorited)
  );

  const pendingCompletedRef = useRef<Record<string, PendingToggle>>({});
  const pendingFavoritesRef = useRef<Record<string, PendingToggle>>({});

  const toggleCompleted = useCallback((problemId: string) => {
    setCompletedSet((prev) => {
      const next = new Set(prev);
      const isCurrentlyDone = next.has(problemId);
      const nextDone = !isCurrentlyDone;

      if (nextDone) next.add(problemId);
      else next.delete(problemId);

      const existing = pendingCompletedRef.current[problemId];
      const initialVal = existing ? existing.initialVal : isCurrentlyDone;

      if (existing) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(async () => {
        const entry = pendingCompletedRef.current[problemId];
        delete pendingCompletedRef.current[problemId];

        if (!entry || entry.latestVal === entry.initialVal) {
          return; // Net-zero change: student toggled on and off before 1s
        }

        try {
          await toggleProgress(collegeSlug, problemId, entry.latestVal);
        } catch (err) {
          console.error('Failed to sync progress state:', err);
          setCompletedSet((currentSet) => {
            const rollback = new Set(currentSet);
            if (entry.initialVal) rollback.add(problemId);
            else rollback.delete(problemId);
            return rollback;
          });
          toast.error('Failed to save progress. Please try again.');
        }
      }, 1000);

      pendingCompletedRef.current[problemId] = {
        initialVal,
        latestVal: nextDone,
        timer,
      };

      return next;
    });
  }, [collegeSlug]);

  const toggleFavorited = useCallback((problemId: string) => {
    setFavoritedSet((prev) => {
      const next = new Set(prev);
      const isCurrentlyFav = next.has(problemId);
      const nextFav = !isCurrentlyFav;

      if (nextFav) next.add(problemId);
      else next.delete(problemId);

      const existing = pendingFavoritesRef.current[problemId];
      const initialVal = existing ? existing.initialVal : isCurrentlyFav;

      if (existing) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(async () => {
        const entry = pendingFavoritesRef.current[problemId];
        delete pendingFavoritesRef.current[problemId];

        if (!entry || entry.latestVal === entry.initialVal) {
          return; // Net-zero change: student toggled revision on and off before 1s
        }

        try {
          await toggleFavorite(collegeSlug, problemId, entry.latestVal);
        } catch (err) {
          console.error('Failed to sync favorite state:', err);
          setFavoritedSet((currentSet) => {
            const rollback = new Set(currentSet);
            if (entry.initialVal) rollback.add(problemId);
            else rollback.delete(problemId);
            return rollback;
          });
          toast.error('Failed to save revision bookmark.');
        }
      }, 1000);

      pendingFavoritesRef.current[problemId] = {
        initialVal,
        latestVal: nextFav,
        timer,
      };

      return next;
    });
  }, [collegeSlug]);

  // Flush any pending net-changed toggles immediately when component unmounts
  useEffect(() => {
    const compMap = pendingCompletedRef.current;
    const favMap = pendingFavoritesRef.current;

    return () => {
      for (const [pId, entry] of Object.entries(compMap)) {
        clearTimeout(entry.timer);
        if (entry.latestVal !== entry.initialVal) {
          void toggleProgress(collegeSlug, pId, entry.latestVal);
        }
      }
      for (const [pId, entry] of Object.entries(favMap)) {
        clearTimeout(entry.timer);
        if (entry.latestVal !== entry.initialVal) {
          void toggleFavorite(collegeSlug, pId, entry.latestVal);
        }
      }
    };
  }, [collegeSlug, studentId]);

  const value = useMemo(
    () => ({
      completedProblemIds: completedSet,
      favoritedProblemIds: favoritedSet,
      toggleCompleted,
      toggleFavorited,
      studentId,
      collegeSlug,
    }),
    [completedSet, favoritedSet, toggleCompleted, toggleFavorited, studentId, collegeSlug]
  );

  return (
    <DsaProgressContext.Provider value={value}>
      {children}
    </DsaProgressContext.Provider>
  );
}
