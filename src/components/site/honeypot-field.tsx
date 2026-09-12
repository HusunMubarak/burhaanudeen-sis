/**
 * A5: hidden field real users never see or fill in. Bots that
 * autofill every form field will fill this one — the server treats a
 * non-empty value as a bot submission (see src/lib/public-guard.ts).
 * Positioned off-screen rather than display:none, since some bots
 * skip display:none fields specifically.
 */
export function HoneypotField() {
  return (
    <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }} aria-hidden="true">
      <label htmlFor="website">Website</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
