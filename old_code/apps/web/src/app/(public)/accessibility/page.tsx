import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AccessibilityPage() {
  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to home
        </Link>
      </div>

      <h1 className="mb-4 text-4xl font-bold">Accessibility Statement</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Last updated: November 17, 2025
      </p>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Our Commitment to Accessibility</h2>
          <p>
            Castiel is committed to ensuring digital accessibility for people with disabilities. We
            are continually improving the user experience for everyone and applying the relevant
            accessibility standards to ensure we provide equal access to all our users.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Conformance Status</h2>
          <p>
            The{" "}
            <a
              href="https://www.w3.org/WAI/WCAG21/quickref/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Web Content Accessibility Guidelines (WCAG)
            </a>{" "}
            define requirements for designers and developers to improve accessibility for people with
            disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA.
          </p>
          <p>
            Castiel is partially conformant with WCAG 2.1 level AA. Partially conformant means that
            some parts of the content do not fully conform to the accessibility standard.
          </p>
        </section>

        <Card className="my-8">
          <CardHeader>
            <CardTitle>Accessibility Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-1 font-semibold">Keyboard Navigation</h4>
              <p className="text-sm text-muted-foreground">
                All interactive elements can be accessed and operated using keyboard controls (Tab,
                Enter, Spacebar, Arrow keys).
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-semibold">Screen Reader Support</h4>
              <p className="text-sm text-muted-foreground">
                Content is structured with semantic HTML and ARIA labels to support screen readers
                like NVDA, JAWS, and VoiceOver.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-semibold">Visual Design</h4>
              <p className="text-sm text-muted-foreground">
                Color contrast ratios meet WCAG AA standards (4.5:1 for normal text, 3:1 for large
                text). Text can be resized up to 200% without loss of functionality.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-semibold">Focus Indicators</h4>
              <p className="text-sm text-muted-foreground">
                Clear visual focus indicators show which element currently has keyboard focus.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-semibold">Alternative Text</h4>
              <p className="text-sm text-muted-foreground">
                Images and icons include alternative text descriptions for screen reader users.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-semibold">Error Identification</h4>
              <p className="text-sm text-muted-foreground">
                Form errors are clearly identified with descriptive messages and suggestions for
                correction.
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-semibold">Responsive Design</h4>
              <p className="text-sm text-muted-foreground">
                The interface adapts to different screen sizes and can be used in portrait or
                landscape orientation.
              </p>
            </div>
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Known Limitations</h2>
          <p>
            Despite our best efforts to ensure accessibility, there may be some limitations. Below
            is a description of known limitations and potential solutions:
          </p>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-2 font-semibold">Complex Data Tables</h4>
              <p className="text-sm text-muted-foreground">
                Some complex data tables may be difficult to navigate with screen readers.
                <br />
                <strong>Workaround:</strong> Use the data export feature to download data in a
                format compatible with your assistive technology.
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-2 font-semibold">Third-Party Integrations</h4>
              <p className="text-sm text-muted-foreground">
                Third-party content embedded in the platform may not fully meet accessibility
                standards.
                <br />
                <strong>Workaround:</strong> Contact us if you encounter specific issues with
                third-party content.
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-2 font-semibold">File Attachments</h4>
              <p className="text-sm text-muted-foreground">
                We cannot guarantee that uploaded files from other users meet accessibility
                standards.
                <br />
                <strong>Recommendation:</strong> Encourage your team to upload accessible documents
                (PDFs with tags, descriptive filenames, etc.).
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Assistive Technologies</h2>
          <p>
            Castiel is designed to be compatible with the following assistive technologies:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Screen readers (NVDA, JAWS, VoiceOver, TalkBack)</li>
            <li>Keyboard-only navigation</li>
            <li>Voice recognition software (Dragon NaturallySpeaking)</li>
            <li>Screen magnification software (ZoomText, Windows Magnifier)</li>
            <li>Browser extensions for accessibility (e.g., high contrast modes)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Browser Compatibility</h2>
          <p>
            For the best accessibility experience, we recommend using the latest versions of:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Google Chrome</li>
            <li>Mozilla Firefox</li>
            <li>Microsoft Edge</li>
            <li>Apple Safari</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Technical Specifications</h2>
          <p>
            Accessibility of Castiel relies on the following technologies to work:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>HTML5</li>
            <li>WAI-ARIA</li>
            <li>CSS3</li>
            <li>JavaScript</li>
          </ul>
          <p>
            These technologies are relied upon for conformance with the accessibility standards used.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Assessment and Testing</h2>
          <p>
            Castiel's accessibility has been assessed using:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Automated testing with axe-core and Lighthouse</li>
            <li>Manual testing with keyboard navigation</li>
            <li>Screen reader testing (NVDA, VoiceOver)</li>
            <li>User testing with people with disabilities</li>
            <li>Regular accessibility audits</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Feedback and Contact</h2>
          <p>
            We welcome your feedback on the accessibility of Castiel. Please let us know if you
            encounter accessibility barriers:
          </p>
          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="text-sm">
              <strong>Email:</strong> accessibility@castiel.com
              <br />
              <strong>Support:</strong> support@castiel.com
              <br />
              <strong>Response Time:</strong> We aim to respond within 2 business days
            </p>
          </div>
          <p className="mt-4">
            When reporting an accessibility issue, please include:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>The page or feature you were trying to access</li>
            <li>The assistive technology you're using (if applicable)</li>
            <li>The browser and operating system you're using</li>
            <li>A description of the problem</li>
            <li>Screenshots or screen recordings (if possible)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Continuous Improvement</h2>
          <p>
            Accessibility is an ongoing effort. We are committed to:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Conducting regular accessibility audits</li>
            <li>Training our development team on accessibility best practices</li>
            <li>Incorporating accessibility into our design and development process</li>
            <li>Testing with users who have disabilities</li>
            <li>Addressing reported accessibility issues promptly</li>
            <li>Updating this statement as improvements are made</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Formal Complaints</h2>
          <p>
            If you are not satisfied with our response to your accessibility feedback, you may:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Request escalation to our accessibility team</li>
            <li>
              File a complaint with the relevant authority in your jurisdiction (e.g., Office for
              Civil Rights in the US, Equality and Human Rights Commission in the UK)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Resources</h2>
          <p>
            For more information about web accessibility:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <a
                href="https://www.w3.org/WAI/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Web Accessibility Initiative (WAI)
              </a>
            </li>
            <li>
              <a
                href="https://www.w3.org/WAI/WCAG21/quickref/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                WCAG 2.1 Quick Reference
              </a>
            </li>
            <li>
              <a
                href="https://www.a11yproject.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                The A11Y Project
              </a>
            </li>
          </ul>
        </section>

        <div className="mt-8 rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            This accessibility statement was created on November 17, 2025, and last reviewed on
            November 17, 2025.
          </p>
        </div>
      </div>
    </div>
  )
}
