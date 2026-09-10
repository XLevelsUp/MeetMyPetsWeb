/**
 * Irregular "hand-cut" outline, in objectBoundingBox units (0-1) so one path
 * scales to any element's size without re-authoring per breakpoint.
 *
 * Originally authored for reels.tsx's card grid (three variants there); this
 * is the same first path, pulled out so hero.tsx can reuse it for the
 * flip-card without duplicating the SVG path data. The shape stays close to
 * a rounded rectangle on purpose — pets are photographed centred and
 * upright, and a wilder outline crops ears and faces.
 */
export const HERO_BLOB_PATH =
  "M0.5,0.005 C0.78,0.005 0.97,0.06 0.99,0.28 C1.01,0.5 0.99,0.72 0.97,0.85 C0.94,0.97 0.78,0.998 0.5,0.998 C0.22,0.998 0.06,0.96 0.03,0.83 C0.01,0.7 -0.01,0.48 0.01,0.27 C0.03,0.06 0.22,0.005 0.5,0.005 Z";
