'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { LandingCourseCard } from './landing-data-types';
import { LandingBestCourseCard } from './landing-best-course-card';
import { useLandingReducedMotion } from './landing-motion';

const MIN_MARQUEE_CARDS = 3;

function padMarqueeCourses(courses: LandingCourseCard[]): LandingCourseCard[] {
  if (courses.length === 0) return courses;
  if (courses.length >= MIN_MARQUEE_CARDS) return courses;

  const padded: LandingCourseCard[] = [...courses];
  let i = 0;
  while (padded.length < MIN_MARQUEE_CARDS) {
    const source = courses[i % courses.length];
    padded.push({
      ...source,
      id: `${source.id}-marquee-pad-${padded.length}`,
    });
    i += 1;
  }
  return padded;
}

interface BestCoursesMarqueeProps {
  courses: LandingCourseCard[];
}

export function BestCoursesMarquee({ courses }: BestCoursesMarqueeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const xRef = useRef(0);
  const reduceMotion = useLandingReducedMotion();

  const displayCourses = useMemo(() => padMarqueeCourses(courses), [courses]);
  const loopCourses = useMemo(
    () => [...displayCourses, ...displayCourses],
    [displayCourses],
  );

  useEffect(() => {
    if (reduceMotion || !trackRef.current || displayCourses.length < 2) return;

    const track = trackRef.current;
    let animationId: number;
    let lastTime = performance.now();
    const baseSpeed = 0.8;
    xRef.current = 0;
    track.style.transform = 'translate3d(0, 0, 0)';

    const animate = (currentTime: number) => {
      if (pausedRef.current) {
        animationId = requestAnimationFrame(animate);
        lastTime = currentTime;
        return;
      }

      const delta = currentTime - lastTime;
      lastTime = currentTime;

      const halfWidth = track.scrollWidth / 2;
      const speed = baseSpeed * (delta / 16);

      let newX = xRef.current - speed;

      if (Math.abs(newX) >= halfWidth) {
        newX = 0;
      }

      xRef.current = newX;
      track.style.transform = `translate3d(${newX}px, 0, 0)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [displayCourses, reduceMotion]);

  if (reduceMotion) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {displayCourses.map((course) => (
          <LandingBestCourseCard key={course.id} course={course} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="landing-marquee-mask relative"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onFocusCapture={() => { pausedRef.current = true; }}
      onBlurCapture={() => { pausedRef.current = false; }}
    >
      <div
        ref={trackRef}
        className="flex w-max items-stretch gap-6 will-change-transform [backface-visibility:hidden]"
        aria-label="Best courses carousel"
      >
        {loopCourses.map((course, index) => (
          <div key={`${course.id}-${index}`} className="flex shrink-0 items-stretch">
            <LandingBestCourseCard course={course} />
          </div>
        ))}
      </div>
    </div>
  );
}
