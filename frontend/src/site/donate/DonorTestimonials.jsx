/**
 * Deferred until FastAPI exposes a moderated, privacy-safe testimonial API.
 * Returning no UI prevents the legacy Django endpoint from being called and
 * prevents unmoderated donor messages from becoming public.
 */
export default function DonorTestimonials() {
  return null;
}
