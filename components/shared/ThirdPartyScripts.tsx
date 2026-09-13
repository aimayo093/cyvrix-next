"use client";

/**
 * Loads the analytics services switched on in the Integrations CMS.
 *
 * CookieConsent mounts this only once the visitor has allowed analytics, so it
 * never has to answer the consent question itself: if it is mounted, consent
 * exists.
 *
 * Each identifier is checked against its pattern again immediately before it is
 * placed inside a script. The server has already checked it on save and on
 * read; this is the last point it could be caught, and the check is cheap.
 */
import { Fragment } from "react";
import Script from "next/script";
import { getIntegration, type ActiveIntegration } from "@/lib/integrations";

export function ThirdPartyScripts({ integrations }: { integrations: ActiveIntegration[] }) {
  const safe = integrations.filter((integration) => {
    const definition = getIntegration(integration.id);
    return definition.category === "analytics" && definition.pattern.test(integration.value);
  });

  return (
    <>
      {safe.map((integration) => {
        switch (integration.id) {
          case "google-analytics":
            return (
              <Fragment key={integration.id}>
                <Script
                  src={`https://www.googletagmanager.com/gtag/js?id=${integration.value}`}
                  strategy="afterInteractive"
                />
                <Script id="integration-google-analytics" strategy="afterInteractive">
                  {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${integration.value}');`}
                </Script>
              </Fragment>
            );
          case "microsoft-clarity":
            return (
              <Script key={integration.id} id="integration-microsoft-clarity" strategy="afterInteractive">
                {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${integration.value}");`}
              </Script>
            );
          case "plausible":
            return (
              <Script
                key={integration.id}
                src="https://plausible.io/js/script.js"
                data-domain={integration.value}
                strategy="afterInteractive"
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
