export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'slate',
      neutral: 'slate'
    }
  },
  site: {
    name: 'GeoSpecimens Vocabulary Browser',
    logo: null as string | null,
    icon: 'i-heroicons-book-open',
    tagline: 'Vocabulary Publishing Platform',
    footerText: 'Part of the GeoSpecimens Data Mobilization Platform',
    footerLinks: [
      { label: 'GeoSpecimens.org', href: 'https://geoapis.io' },
    ],
    editor: {
      defaultMode: 'inline' as 'inline' | 'full'
    },
    promotion: {
      enabled: true
    }
  }
})
