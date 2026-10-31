export type Locale = "en" | "am"

export interface TranslationDictionary {
  appName: string
  subTitle: string
  searchPlaceholder: string
  clearSearch: string
  allCategories: string
  placesTab: string
  servicesTab: string
  noLocationsFound: string
  noLocationsHint: string
  clearFilters: string
  locationCountSingular: string
  locationCountPlural: string
  placesInside: string
  locatedInside: string
  operatingHours: string
  directions: string
  share: string
  linkCopied: string
  reportProblem: string
  backToAll: string
  floorPrefix: string
  onMap: string
  viewMap: string
  viewSplit: string
  viewList: string
  distanceAway: string
  nearby: string
  openNow: string
  closedNow: string
  servicesEmptyTitle: string
  servicesEmptyDesc: string
}

export const translations: Record<Locale, TranslationDictionary> = {
  en: {
    appName: "DDU Campus Guide",
    subTitle: "Dire Dawa University",
    searchPlaceholder: "Search by name, description, or code (e.g. B-002)...",
    clearSearch: "Clear search",
    allCategories: "All",
    placesTab: "Places",
    servicesTab: "Services",
    noLocationsFound: "No campus locations found",
    noLocationsHint: "Try adjusting your search terms or selecting a different category.",
    clearFilters: "Clear filters and search",
    locationCountSingular: "location found",
    locationCountPlural: "locations found",
    placesInside: "Places Inside",
    locatedInside: "Located inside",
    operatingHours: "Hours",
    directions: "Directions",
    share: "Share",
    linkCopied: "Link copied!",
    reportProblem: "Report a Problem",
    backToAll: "Back to all locations",
    floorPrefix: "Floor",
    onMap: "On Map",
    viewMap: "Map",
    viewSplit: "Split",
    viewList: "List",
    distanceAway: "away",
    nearby: "Nearby",
    openNow: "Open Now",
    closedNow: "Closed",
    servicesEmptyTitle: "No campus services listed",
    servicesEmptyDesc: "Administrative and student services will appear here.",
  },
  am: {
    appName: "ድሬዳዋ ዩኒቨርሲቲ ካምፓስ መመሪያ",
    subTitle: "ድሬዳዋ ዩኒቨርሲቲ",
    searchPlaceholder: "በስም፣ መግለጫ ወይም በህንፃ ኮድ ይፈልጉ (ለምሳሌ B-002)...",
    clearSearch: "ፍለጋ አጽዳ",
    allCategories: "ሁሉም",
    placesTab: "ቦታዎች",
    servicesTab: "አገልግሎቶች",
    noLocationsFound: "ምንም የካምፓስ ቦታ አልተገኘም",
    noLocationsHint: "የፍለጋ ቃላትን ይቀይሩ ወይም ሌላ ምድብ ይምረጡ።",
    clearFilters: "ማጣሪያዎችን እና ፍለጋን አጽዳ",
    locationCountSingular: "ቦታ ተገኝቷል",
    locationCountPlural: "ቦታዎች ተገኝተዋል",
    placesInside: "ውስጥ ያሉ ክፍሎች እና ቦታዎች",
    locatedInside: "የሚገኘው በ",
    operatingHours: "የስራ ሰዓት",
    directions: "አቅጣጫዎች",
    share: "አጋራ",
    linkCopied: "ሊንኩ ተቀድቷል!",
    reportProblem: "ችግር ሪፖርት አድርግ",
    backToAll: "ወደ ሁሉም ቦታዎች ተመለስ",
    floorPrefix: "ፎቅ",
    onMap: "ካርታ ላይ አሳይ",
    viewMap: "ካርታ",
    viewSplit: "ተከፋፍሎ",
    viewList: "ዝርዝር",
    distanceAway: "ርቀት",
    nearby: "አቅራቢያ ያሉ",
    openNow: "ክፍት ነው",
    closedNow: "ዝግ ነው",
    servicesEmptyTitle: "ምንም የተመዘገበ አገልግሎት የለም",
    servicesEmptyDesc: "የአስተዳደር እና የተማሪዎች አገልግሎቶች እዚህ ይታያሉ።",
  },
}

/**
 * Category names translations mapping
 */
export const categoryTranslations: Record<string, Record<Locale, string>> = {
  academics: {
    en: "Academics",
    am: "ትምህርት",
  },
  administration: {
    en: "Administration",
    am: "አስተዳደር",
  },
  "student life": {
    en: "Student Life",
    am: "የተማሪዎች ህይወት",
  },
  dormitory: {
    en: "Dormitory",
    am: "የተማሪዎች ማደሪያ",
  },
  "healthcare & facilities": {
    en: "Healthcare & Facilities",
    am: "ጤና እና አገልግሎት",
  },
  facilities: {
    en: "Facilities",
    am: "አገልግሎቶች",
  },
}

export function getLocalizedCategoryName(
  categoryName?: string | null,
  locale: Locale = "en"
): string {
  if (!categoryName || typeof categoryName !== "string") return ""
  if (locale === "en") return categoryName
  const lower = categoryName.toLowerCase().trim()
  return categoryTranslations[lower]?.[locale] || categoryName
}

/**
 * Format distance in meters to a human-readable localized string
 */
export function formatDistance(meters: number, locale: Locale = "en"): string {
  if (meters < 1000) {
    const rounded = Math.round(meters)
    return locale === "am" ? `~${rounded} ሜትር ርቀት` : `~${rounded} m away`
  }
  const km = (meters / 1000).toFixed(1)
  return locale === "am" ? `~${km} ኪ.ሜ ርቀት` : `~${km} km away`
}
