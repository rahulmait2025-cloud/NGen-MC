/**
 * Matcher for the public student catalog/marketing route tree.
 *
 * Route groups are not visible to middleware, so every public URL under
 * app/c/[collegeSlug]/student/(public) must be allowed here explicitly.
 * Keep authenticated sibling URLs out of this list.
 */
export const publicStudentRouteRegexes = [
  /^\/c\/[^/]+\/student\/?$/,
  /^\/c\/[^/]+\/student\/(?:free-courses|our-team|paid-courses|terms|privacy|cookies|refund-policy|cancellation-policy)\/?$/,
  /^\/c\/[^/]+\/student\/courses\/?$/,
  /^\/c\/[^/]+\/student\/courses\/(?!youtube(?:\/|$))[^/]+\/?$/,
  /^\/c\/[^/]+\/student\/bootcamp\/?$/,
  /^\/c\/[^/]+\/student\/bootcamp\/pillars\/[^/]+\/?$/,
  /^\/c\/[^/]+\/student\/bootcamp\/pillars\/[^/]+\/courses\/[^/]+\/?$/,
  /^\/c\/[^/]+\/student\/bundles\/?$/,
  /^\/c\/[^/]+\/student\/bundles\/[^/]+\/?$/,
  /^\/c\/[^/]+\/student\/pillars\/?$/,
  /^\/c\/[^/]+\/student\/pillars\/[^/]+\/?$/,
  /^\/c\/[^/]+\/student\/pillars\/[^/]+\/courses\/[^/]+\/?$/,
];

export function isPublicStudentRoute(pathname: string): boolean {
  return publicStudentRouteRegexes.some((regex) => regex.test(pathname));
}
