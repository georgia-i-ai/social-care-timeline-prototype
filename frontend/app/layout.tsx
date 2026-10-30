import type { Metadata } from "next";
// globals.css must come after the kit's styles so its overrides win on equal specificity.
import "../styles/idotai.scss";
import "./globals.css";
import {
  Footer,
  Header,
  PhaseBanner,
  PhaseBannerText,
  SkipLink,
} from "@i-dot-ai-npm/component-library-react";
import { DesignKitInit } from "@/components/DesignKitInit";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Case Timeline Prototype",
  description: "Tinkering demo - unstructured notes to a structured, reviewable timeline.",
};

// Set before hydration, as the kit's template does, so its CSS/JS feature checks apply.
const bodyClassScript = {
  __html: `document.body.className += " js-enabled" + ("noModule" in HTMLScriptElement.prototype ? " govuk-frontend-supported" : "");`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="govuk-template__body" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={bodyClassScript} />
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <header>
          <Header href="/">Case Timeline Prototype</Header>
        </header>
        <PhaseBanner>
          <PhaseBannerText>
            Tinkering demo - synthetic data only, not connected to any real case system.
          </PhaseBannerText>
        </PhaseBanner>
        <div className="govuk-width-container" style={{ display: "flex", alignItems: "flex-start" }}>
          <Sidebar />
          <main className="govuk-main-wrapper" id="main-content" style={{ flex: 1, minWidth: 0 }}>
            {children}
          </main>
        </div>
        <Footer />
        <DesignKitInit />
      </body>
    </html>
  );
}
