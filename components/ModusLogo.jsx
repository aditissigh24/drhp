/**
 * Modus AI wordmark, matching the treatment in the Updates Tracker app:
 * lowercase "modus ai" in #00285B with a sparkle riding the top-right.
 * Inline SVG so it carries no icon-library dependency.
 */
export default function ModusLogo() {
  return (
    <span className="modus" aria-label="Modus AI">
      <span className="modus-word">modus&nbsp;<b>ai</b></span>
      <svg className="modus-spark" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z" />
        <path d="M20 3v4M22 5h-4M4 17v2M5 18H3" />
      </svg>
    </span>
  );
}
