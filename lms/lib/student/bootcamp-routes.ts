import { studentBasePath } from '@/lib/student/student-home-route';



export const JOB_READY_BOOTCAMP_SLUG = 'job-ready-bootcamp';

export const JOB_READY_BOOTCAMP_TITLE = 'Job Ready Bootcamp';



export function buildBootcampLandingHref(collegeSlug: string): string {

  return `${studentBasePath(collegeSlug)}/bootcamp`;

}



function _buildBootcampPillarHref(collegeSlug: string, pillarSlug: string): string {

  return `${studentBasePath(collegeSlug)}/bootcamp/pillars/${encodeURIComponent(pillarSlug)}`;

}



export function buildBootcampCoursePreviewHref(

  collegeSlug: string,

  pillarSlug: string,

  courseId: string,

): string {

  return `${studentBasePath(collegeSlug)}/bootcamp/pillars/${encodeURIComponent(pillarSlug)}/courses/${encodeURIComponent(courseId)}`;

}



export function buildEnrolledBootcampHubHref(collegeSlug: string): string {

  return `${studentBasePath(collegeSlug)}/my-courses/job-ready-bootcamp`;

}

export function buildBootcampPaymentSuccessHref(collegeSlug: string): string {
  return `${studentBasePath(collegeSlug)}/payment-success?bootcamp=1`;
}

function _buildMyCoursesBootcampTabHref(collegeSlug: string): string {
  return `${studentBasePath(collegeSlug)}/my-courses?tab=job-ready-bootcamp`;
}



export function buildEnrolledBootcampPillarHref(collegeSlug: string, pillarSlug: string): string {

  return `${studentBasePath(collegeSlug)}/my-courses/job-ready-bootcamp/pillars/${encodeURIComponent(pillarSlug)}`;

}

