export type ServiceDetailSection = {
  title: string;
  items: string[];
  note?: string;
};

export type ServiceDetailContent = {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  heroParagraphs: string[];
  includes: ServiceDetailSection;
  whoNeeds: ServiceDetailSection;
  pricing: {
    fromPrice: string;
    paragraphs: string[];
  };
  duration: ServiceDetailSection;
  customerReceives: ServiceDetailSection;
  beforeBooking: ServiceDetailSection;
  cta: {
    title: string;
    subtitle: string;
  };
};

const FIRE_RISK_ASSESSMENT: ServiceDetailContent = {
  slug: "fire-risk-assessment",
  seoTitle: "Fire Risk Assessment Near You | Compare Prices & Book Online | Fire Guide",
  metaDescription:
    "Book a professional fire risk assessment for your business, rental property, HMO, shop, office or commercial premises. Compare local professionals, see prices and book online.",
  h1: "Fire Risk Assessment",
  heroParagraphs: [
    "A fire risk assessment helps you understand the fire risks in your premises and what needs to be done to keep people safe.",
    "With Fire Guide, you can compare local fire safety professionals, see clear prices, check availability and book online.",
  ],
  includes: {
    title: "What this service includes",
    items: [
      "A visit to your premises by a fire safety professional",
      "Review of fire hazards and ignition sources",
      "Review of people at risk, including staff, visitors and vulnerable occupants",
      "Check of escape routes, exits and final exits",
      "Review of fire doors, compartmentation and general fire separation where visible",
      "Review of fire alarm and detection arrangements",
      "Review of emergency lighting, fire extinguishers and signage",
      "Review of fire safety management, training and maintenance records",
      "Clear action plan showing what needs to be improved",
      "Written FRA report for your records",
    ],
  },
  whoNeeds: {
    title: "Who needs this service?",
    items: [
      "Shops and retail units",
      "Offices",
      "Warehouses and workshops",
      "Restaurants, takeaways and cafés",
      "HMOs and blocks of flats",
      "Care and supported living premises",
      "Community buildings and places of worship",
      "Landlords and managing agents",
      "Any business or premises where people work, visit or stay",
    ],
    note: "In England and Wales, the RP must make sure a suitable and sufficient FRA is completed and kept under review.",
  },
  pricing: {
    fromPrice: "From £1.00",
    paragraphs: [
      "The final price depends on the type of premises, size, number of floors, use of the building, sleeping risk, complexity and urgency.",
      "Small simple premises are usually at the lower end. Larger, complex or higher-risk premises may require a custom quote.",
      "Recent UK pricing guides place FRA costs from around £150 to £1,500+ depending on premises type and complexity, so from £1.00 is a realistic marketplace starting point.",
    ],
  },
  duration: {
    title: "How long does it take?",
    items: [
      "Site visit: 1–3 hours for most simple premises",
      "Report turnaround: usually 2–5 working days",
      "Larger or more complex premises may take longer",
    ],
  },
  customerReceives: {
    title: "What the customer receives",
    items: [
      "A written FRA report",
      "Significant findings",
      "Risk rating where applicable",
      "Prioritised action plan",
      "Photographs or observations where appropriate",
      "Practical recommendations",
      "Review date guidance",
      "Digital copy available through the Fire Guide portal",
    ],
  },
  beforeBooking: {
    title: "What information is needed before booking?",
    items: [
      "Premises address and postcode",
      "Property type",
      "Number of floors",
      "Approximate size",
      "Number of occupants",
      "Whether anyone sleeps on the premises",
      "Whether vulnerable people may be present",
      "Existing FRA, if available",
      "Fire alarm, emergency lighting and extinguisher records, if available",
      "Any enforcement letters, insurance requests or urgent deadlines",
    ],
  },
  cta: {
    title: "Need a fire risk assessment?",
    subtitle: "Compare local fire safety professionals, see clear prices and book online in minutes.",
  },
};

const FIRE_ALARM_SERVICE: ServiceDetailContent = {
  slug: "fire-alarm-service",
  seoTitle: "Fire Alarm Service Near You | Book Fire Alarm Maintenance | Fire Guide",
  metaDescription:
    "Book a fire alarm service for your business or commercial premises. Compare local engineers, see prices and arrange fire alarm maintenance online.",
  h1: "Fire Alarm Service",
  heroParagraphs: [
    "Your fire alarm system needs to work when it matters most. Regular servicing helps identify faults, maintain compliance and keep your premises protected.",
    "With Fire Guide, you can compare local fire alarm professionals, view prices and book a service visit online.",
  ],
  includes: {
    title: "What this service includes",
    items: [
      "Inspection of the fire alarm control panel",
      "Check of detectors, call points and sounders",
      "Testing of selected devices",
      "Review of fault indicators and warning lights",
      "Battery and power supply checks",
      "Check of alarm zones and operation",
      "Review of logbook records where available",
      "Identification of faults or defects",
      "Service certificate or maintenance record",
      "Advice on any remedial works required",
    ],
  },
  whoNeeds: {
    title: "Who needs this service?",
    items: [
      "Offices",
      "Shops and retail units",
      "Restaurants and takeaways",
      "Warehouses and workshops",
      "HMOs and residential common areas",
      "Care settings",
      "Schools, nurseries and community buildings",
      "Landlords and managing agents",
      "Any premises with a fire detection and alarm system",
    ],
    note: "The recommended period between fire alarm inspection and servicing visits should not exceed six months under BS 5839-related guidance.",
  },
  pricing: {
    fromPrice: "From £0.00",
    paragraphs: [
      "The price depends on the size of the system, number of devices, type of panel, number of zones, building size, access arrangements and whether it is a one-off visit or maintenance contract.",
      "UK commercial fire alarm maintenance contracts for small businesses commonly sit around £200–£500 per year for basic systems.",
    ],
  },
  duration: {
    title: "How long does it take?",
    items: [
      "Service visit: 1–2 hours for most small systems",
      "Larger systems: half day or more",
      "If faults are found, remedial works may need to be quoted separately",
    ],
  },
  customerReceives: {
    title: "What the customer receives",
    items: [
      "Fire alarm service record",
      "Confirmation of devices tested",
      "Faults or defects identified",
      "Recommendations for remedial works",
      "Engineer notes",
      "Digital copy through the Fire Guide portal where available",
    ],
  },
  beforeBooking: {
    title: "What information is needed before booking?",
    items: [
      "Premises address and postcode",
      "Type of premises",
      "Approximate number of floors",
      "Fire alarm panel location",
      "Approximate number of devices, if known",
      "Last service date, if known",
      "Any known faults showing on the panel",
      "Access details",
      "Whether the system is monitored by an alarm receiving centre",
    ],
  },
  cta: {
    title: "Need your fire alarm serviced?",
    subtitle:
      "Compare local fire alarm professionals, choose a convenient date and book online.",
  },
};

const FIRE_EXTINGUISHER_SERVICE: ServiceDetailContent = {
  slug: "fire-extinguisher-service",
  seoTitle:
    "Fire Extinguisher Service Near You | Book Annual Extinguisher Maintenance | Fire Guide",
  metaDescription:
    "Book fire extinguisher servicing for your workplace, shop, office, HMO or commercial premises. Compare local professionals and arrange maintenance online.",
  h1: "Fire Extinguisher Service",
  heroParagraphs: [
    "Fire extinguishers should be maintained so they are ready to use in an emergency. Regular servicing helps confirm they are in the right condition, correctly located and properly recorded.",
    "With Fire Guide, you can compare local professionals, check prices and book fire extinguisher servicing online.",
  ],
  includes: {
    title: "What this service includes",
    items: [
      "Visual inspection of each extinguisher",
      "Check of pressure gauges and indicators",
      "Check of extinguisher condition",
      "Check of pins, seals, hoses and labels",
      "Check of location and accessibility",
      "Review of service dates",
      "Identification of missing, damaged or expired units",
      "Basic annual service where suitable",
      "Service labels updated",
      "Written service record or certificate",
    ],
    note: "Replacement parts, refills, extended servicing or replacement extinguishers may be charged separately.",
  },
  whoNeeds: {
    title: "Who needs this service?",
    items: [
      "Shops and retail units",
      "Offices",
      "Restaurants, cafés and takeaways",
      "Warehouses and workshops",
      "HMOs and blocks of flats",
      "Landlords and managing agents",
      "Small businesses",
      "Community buildings",
      "Any premises with portable fire extinguishers",
    ],
    note: "BAFE guidance states that a basic fire extinguisher service should be performed at least annually.",
  },
  pricing: {
    fromPrice: "From £12.00",
    paragraphs: [
      "The price depends on the number of extinguishers, extinguisher type, site location, whether parts are required and whether any units need replacing.",
      "Some UK servicing guides refer to small premises annual servicing around this level, while older pricing guides show visit charges plus a per-extinguisher cost.",
    ],
  },
  duration: {
    title: "How long does it take?",
    items: [
      "Service visit: 30–90 minutes for most small premises",
      "Larger sites or buildings with many extinguishers may take longer",
    ],
  },
  customerReceives: {
    title: "What the customer receives",
    items: [
      "Fire extinguisher service record",
      "Updated service labels",
      "List of extinguishers checked",
      "Any faults or defects found",
      "Advice on missing or unsuitable extinguishers",
      "Quote for replacements or remedial works where required",
    ],
  },
  beforeBooking: {
    title: "What information is needed before booking?",
    items: [
      "Premises address and postcode",
      "Number of extinguishers, if known",
      "Type of premises",
      "Number of floors",
      "Last service date, if known",
      "Any known damaged or missing extinguishers",
      "Access details",
      "Parking or loading information if relevant",
    ],
  },
  cta: {
    title: "Need your fire extinguishers serviced?",
    subtitle: "Compare local professionals and book annual extinguisher maintenance online.",
  },
};

const EMERGENCY_LIGHTING_TEST: ServiceDetailContent = {
  slug: "emergency-lighting-test",
  seoTitle:
    "Emergency Lighting Test Near You | Book Annual Emergency Light Testing | Fire Guide",
  metaDescription:
    "Book emergency lighting testing for your commercial premises, HMO, office, shop or communal areas. Compare local professionals and book online.",
  h1: "Emergency Lighting Test",
  heroParagraphs: [
    "Emergency lighting helps people find their way out if normal lighting fails. Testing helps confirm that escape routes, stairs, exits and key areas have suitable lighting during an emergency.",
    "With Fire Guide, you can compare local professionals, see clear prices and book emergency lighting testing online.",
  ],
  includes: {
    title: "What this service includes",
    items: [
      "Inspection of emergency light fittings",
      "Functional test of emergency lighting",
      "Annual full-duration test where selected",
      "Check that fittings illuminate correctly",
      "Review of escape routes and final exits",
      "Check of visible damage or defects",
      "Battery duration observations",
      "Identification of failed fittings",
      "Test record or certificate",
      "Recommendations for repairs or replacements",
    ],
  },
  whoNeeds: {
    title: "Who needs this service?",
    items: [
      "Offices",
      "Shops and retail premises",
      "Restaurants, cafés and takeaways",
      "Warehouses and workshops",
      "HMOs and residential common areas",
      "Care settings",
      "Schools and community buildings",
      "Landlords and managing agents",
      "Any premises with emergency lighting installed",
    ],
    note: "Recognised guidance refers to monthly functional checks and an annual full-duration test for emergency lighting systems.",
  },
  pricing: {
    fromPrice: "From £50.00",
    paragraphs: [
      "The price depends on the number of fittings, number of floors, size of the building, test duration, access arrangements and whether the test is monthly, annual or remedial.",
      "UK emergency lighting certificate pricing commonly ranges from around £80 to £450 depending on building size and number of fittings.",
    ],
  },
  duration: {
    title: "How long does it take?",
    items: [
      "Functional test: 30–90 minutes for most small premises",
      "Annual full-duration test: up to 3 hours plus inspection time",
      "Larger premises or sites with many fittings may take longer",
    ],
  },
  customerReceives: {
    title: "What the customer receives",
    items: [
      "Emergency lighting test record",
      "Pass/fail observations",
      "List of failed or damaged fittings",
      "Recommendations for remedial works",
      "Confirmation of test type",
      "Digital record through the Fire Guide portal where available",
    ],
  },
  beforeBooking: {
    title: "What information is needed before booking?",
    items: [
      "Premises address and postcode",
      "Property type",
      "Number of floors",
      "Approximate number of emergency lights, if known",
      "Last test date, if known",
      "Whether a monthly or annual test is required",
      "Access details",
      "Any known failed lights or previous defects",
    ],
  },
  cta: {
    title: "Need emergency lighting tested?",
    subtitle: "Compare local professionals, choose a suitable date and book online.",
  },
};

const FIRE_MARSHAL_TRAINING: ServiceDetailContent = {
  slug: "fire-marshal-training",
  seoTitle: "Fire Marshal Training Near You | Fire Warden Training Courses | Fire Guide",
  metaDescription:
    "Book fire marshal or fire warden training for your workplace. Compare trainers, view prices and arrange onsite or group training online.",
  h1: "Fire Marshal / Warden Training",
  heroParagraphs: [
    "Fire marshal training helps nominated staff understand what to do before, during and after a fire emergency.",
    "With Fire Guide, you can compare training providers, check availability and book fire marshal or fire warden training for your team.",
  ],
  includes: {
    title: "What this service includes",
    items: [
      "Fire safety responsibilities",
      "Common causes of fire",
      "Fire prevention in the workplace",
      "What to do when the alarm sounds",
      "Evacuation procedures",
      "Role of the fire marshal or fire warden",
      "Sweeping/checking areas where appropriate",
      "Assembly point procedures",
      "Basic fire extinguisher awareness",
      "Human behaviour in fire",
      "Reporting hazards and defects",
      "Certificate of attendance or completion",
    ],
    note: "Practical extinguisher training may be included by some providers or offered as an add-on.",
  },
  whoNeeds: {
    title: "Who needs this service?",
    items: [
      "Employers",
      "Shops and offices",
      "Warehouses and workshops",
      "Restaurants and hospitality premises",
      "Schools and nurseries",
      "Care and supported living premises",
      "Landlords and managing agents",
      "Any workplace that has nominated fire marshals or wardens",
    ],
  },
  pricing: {
    fromPrice: "From £22.00 per person",
    paragraphs: [
      "From £420 for onsite group sessions",
      "The final price depends on the number of learners, whether training is onsite or remote, practical extinguisher training, location, course length and whether evening/weekend delivery is required.",
      "Current UK training providers commonly advertise around £35–£170 per person, with onsite group sessions often around £420+ depending on provider and location.",
    ],
  },
  duration: {
    title: "How long does it take?",
    items: [
      "Typical duration: 3–4 hours",
      "Some courses: half day",
      "Online or refresher courses may be shorter",
      "Practical courses may take longer",
    ],
  },
  customerReceives: {
    title: "What the customer receives",
    items: [
      "Fire marshal or fire warden training session",
      "Attendance record",
      "Certificates for learners where provided",
      "Course content summary",
      "Practical guidance for staff",
      "Optional group booking record through the Fire Guide portal",
    ],
  },
  beforeBooking: {
    title: "What information is needed before booking?",
    items: [
      "Business or premises address",
      "Number of learners",
      "Preferred training date",
      "Whether onsite or remote training is required",
      "Type of premises",
      "Any specific fire risks",
      "Whether practical extinguisher training is required",
      "Parking/access information for the trainer",
      "Any accessibility needs for learners",
    ],
  },
  cta: {
    title: "Need fire marshal training for your team?",
    subtitle: "Compare trainers, choose a date and book your course online.",
  },
};

const FIRE_SAFETY_CONSULTATION: ServiceDetailContent = {
  slug: "fire-safety-consultation",
  seoTitle: "Fire Safety Consultation | Get Expert Fire Safety Advice | Fire Guide",
  metaDescription:
    "Book a fire safety consultation for practical advice on enforcement issues, fire safety improvements, building changes, escape routes, management or compliance concerns.",
  h1: "Fire Safety Consultation",
  heroParagraphs: [
    "Sometimes you do not need a full service straight away. You may just need clear fire safety advice before making a decision.",
    "Fire Guide lets you book a fire safety consultation with a professional who can review your issue and explain your next steps.",
  ],
  includes: {
    title: "What this service includes",
    items: [
      "General fire safety compliance",
      "Fire safety defects or concerns",
      "Enforcement letters or action plans",
      "Fire risk assessment findings",
      "Escape routes and fire exits",
      "Fire doors and compartmentation concerns",
      "Fire alarm and emergency lighting requirements",
      "Extinguisher provision",
      "Fire safety management procedures",
      "Staff training needs",
      "Landlord or managing agent responsibilities",
      "Pre-purchase or pre-lease fire safety concerns",
      "Preparing for a fire safety inspection",
    ],
    note: "This service can be delivered remotely or on site, depending on the issue.",
  },
  whoNeeds: {
    title: "Who needs this service?",
    items: [
      "Business owners",
      "Landlords",
      "Managing agents",
      "Building managers",
      "Responsible Persons",
      "Property buyers",
      "Tenants with fire safety concerns",
      "Developers and contractors",
      "Care providers",
      "Anyone who needs practical fire safety advice before booking further works",
    ],
  },
  pricing: {
    fromPrice: "From £12 per hour",
    paragraphs: [
      "The final price depends on whether the consultation is remote or onsite, the complexity of the issue, document review time, travel and whether a written summary is required.",
      "UK fire safety consultancy and assessor rates commonly vary depending on experience and provider type, with qualified assessor/consultant hourly rates often advertised or discussed around £50–£120+ per hour.",
    ],
  },
  duration: {
    title: "How long does it take?",
    items: [
      "Remote consultation: 30–60 minutes",
      "Onsite consultation: 1–2 hours",
      "Complex issues: half day or custom quote",
    ],
  },
  customerReceives: {
    title: "What the customer receives",
    items: [
      "Professional fire safety advice",
      "Clear explanation of the issue",
      "Recommended next steps",
      "Optional written summary",
      "Advice on whether a full FRA or specialist service is needed",
      "Follow-up quote where required",
    ],
  },
  beforeBooking: {
    title: "What information is needed before booking?",
    items: [
      "Premises address, if site-specific",
      "Brief description of the issue",
      "Property type",
      "Any photos, plans or reports",
      "Existing FRA, if available",
      "Fire service or enforcement letters, if relevant",
      "Insurance or landlord requirements, if relevant",
      "Preferred consultation method: phone, video or site visit",
    ],
  },
  cta: {
    title: "Need fire safety advice?",
    subtitle: "Book a consultation with a fire safety professional and get clear next steps.",
  },
};

const CONTENT_BY_SLUG: Record<string, ServiceDetailContent> = {
  "fire-risk-assessment": FIRE_RISK_ASSESSMENT,
  "fire-alarm-service": FIRE_ALARM_SERVICE,
  "fire-extinguisher-service": FIRE_EXTINGUISHER_SERVICE,
  "emergency-lighting-test": EMERGENCY_LIGHTING_TEST,
  "fire-marshal-training": FIRE_MARSHAL_TRAINING,
  "fire-safety-consultation": FIRE_SAFETY_CONSULTATION,
};

export function getServiceDetailContent(slug: string): ServiceDetailContent | null {
  return CONTENT_BY_SLUG[slug] ?? null;
}

/** Fallback content when a slug has no bespoke copy yet. */
export function buildGenericServiceDetailContent(
  slug: string,
  serviceName: string,
  fromPrice?: string
): ServiceDetailContent {
  const priceLabel = fromPrice ? `From ${fromPrice.replace(/\.00$/, "")}` : "Get an instant price";
  return {
    slug,
    seoTitle: `${serviceName} Near You | Compare Prices & Book Online | Fire Guide`,
    metaDescription: `Book ${serviceName.toLowerCase()} with verified fire safety professionals. Compare local experts, see clear prices and book online with Fire Guide.`,
    h1: serviceName,
    heroParagraphs: [
      `Get professional ${serviceName.toLowerCase()} support for your premises with clear pricing and online booking.`,
      "With Fire Guide, you can compare local fire safety professionals, check availability and book in minutes.",
    ],
    includes: {
      title: "What this service includes",
      items: [
        "Assessment or service visit by a qualified fire safety professional",
        "Review of relevant fire safety arrangements for your premises",
        "Practical recommendations aligned with UK fire safety requirements",
        "Documentation suitable for your records where applicable",
      ],
    },
    whoNeeds: {
      title: "Who needs this service?",
      items: [
        "Business owners and dutyholders",
        "Landlords and managing agents",
        "Shops, offices and commercial premises",
        "Residential landlords, HMOs and blocks of flats",
        "Any premises where fire safety compliance is required",
      ],
    },
    pricing: {
      fromPrice: priceLabel,
      paragraphs: [
        "The final price depends on your premises type, size, complexity and urgency.",
        "Answer a few quick questions to get an accurate price before you book.",
      ],
    },
    duration: {
      title: "How long does it take?",
      items: [
        "Most visits are completed within a few hours on site",
        "Report or confirmation turnaround varies by service and premises",
        "Your chosen professional will confirm expected times when you book",
      ],
    },
    customerReceives: {
      title: "What the customer receives",
      items: [
        "Professional service delivery by a verified provider",
        "Clear outcomes and recommendations",
        "Documentation where applicable for your records",
        "Access to booking details through the Fire Guide portal",
      ],
    },
    beforeBooking: {
      title: "What information is needed before booking?",
      items: [
        "Premises address and postcode",
        "Property type and approximate size",
        "Number of floors and occupants where relevant",
        "Any existing certificates, records or urgent deadlines",
      ],
    },
    cta: {
      title: `Need ${serviceName.toLowerCase()}?`,
      subtitle: "Compare local fire safety professionals, see clear prices and book online in minutes.",
    },
  };
}
