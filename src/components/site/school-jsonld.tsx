/**
 * schema.org School structured data, rendered on the public homepage.
 * Pulls from the live SchoolSettings row (never hardcoded) so an admin
 * editing address/phone/logo in Settings automatically updates what
 * Google sees too. Uses "School" (a schema.org/EducationalOrganization
 * subtype) with a postal address and geo-less locality — good enough for
 * local "school in Mion / Sang" search intent without inventing
 * coordinates the school hasn't confirmed.
 */
export function SchoolJsonLd({
  settings,
  siteUrl,
}: {
  settings: {
    name: string;
    description: string;
    logoUrl: string | null;
    address: string;
    town: string;
    district: string;
    region: string;
    country: string;
    phone: string;
    email: string;
  };
  siteUrl: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "School",
    name: settings.name,
    description: settings.description,
    url: siteUrl,
    ...(settings.logoUrl ? { logo: settings.logoUrl, image: settings.logoUrl } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      addressLocality: settings.town,
      addressRegion: settings.region,
      addressCountry: settings.country,
    },
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
    areaServed: settings.district,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
