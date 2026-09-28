/**
 * Site footer - converted from the website-footer skill template (templates/footer.html).
 * The template's inline `document.write(new Date().getFullYear())` is replaced with a
 * React expression; the template's styles live in `.site-footer` (assets/layout.css).
 */
export default function Footer() {
  return (
    <footer className="site-footer">
      This is a sample footer for testing Claude Code &copy; {new Date().getFullYear()}
    </footer>
  );
}
