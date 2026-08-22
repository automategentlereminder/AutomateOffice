export function AppFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 px-6 py-4 text-sm text-muted-foreground">
      <p>
        Designed by{" "}
        <a
          href="https://gentlereminder.in/"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          gentlereminder.in
        </a>
        {" · "}
        Follow us on{" "}
        <a
          href="https://www.linkedin.com/company/gentle-reminder-in/"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          LinkedIn
        </a>
      </p>
    </footer>
  );
}
