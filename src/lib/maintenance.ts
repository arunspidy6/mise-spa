// App-wide maintenance flag. When true, the home screen greets users with an
// "under maintenance" notice instead of the Cook CTA, because recipe generation
// is paused server-side (see GENERATION_ENABLED in api/generate-recipe.ts).
//
// This is deliberately a plain build-time constant, not an env var: flipping it
// is a one-line change so the intent is obvious in the diff. When generation
// resumes, set this back to false AND set GENERATION_ENABLED=true in Vercel.
export const MAINTENANCE_MODE = true;
