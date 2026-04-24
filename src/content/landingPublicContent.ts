/**
 * Public marketing landing — single source of truth for copy + media URLs.
 * UI maps over these arrays (nav, heroes, videos, gallery, testimonials, footer).
 */

export type LandingNavItem = {
  href: string;
  label: string;
};

export type LandingHeroSlide = {
  id: string;
  /** Background cover image */
  image: string;
  /** Optional dark gradient overlay (Tailwind classes) */
  overlayClassName?: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  body?: string;
  attribution?: string;
  /** Serif / italic treatment for pull quotes */
  titleAsQuote?: boolean;
  cta?: { label: string; href: string; variant: "white" | "indigo" };
};

export type LandingVideoEmbed = {
  id: string;
  title: string;
  /** YouTube embed id */
  youtubeId: string;
};

export type LandingGalleryImage = {
  id: string;
  src: string;
  alt: string;
};

export type LandingTestimonial = {
  id: string;
  quote: string;
  author: string;
};

export type LandingFooterSocial = {
  id: string;
  label: string;
  href: string;
  /** Simple inline SVG path for monochrome icon */
  icon: "instagram" | "linkedin" | "youtube";
};

export const LANDING_NAV: LandingNavItem[] = [
  { href: "#offers", label: "Offers" },
  { href: "#programs", label: "Programs" },
  { href: "#store", label: "Shop" },
  { href: "#articles", label: "Insights" },
];

export const LANDING_HERO_SLIDES: LandingHeroSlide[] = [
  {
    id: "hero",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=2400",
    overlayClassName: "from-slate-50/95 via-slate-100/90 to-slate-200/70",
    kicker: "Elevate your influence",
    title: "Leaders Change the World",
    subtitle:
      "Join the world's most influential leadership community. Access proven strategies, connect with mentors, and grow your potential.",
    cta: { label: "Start Your Journey", href: "#programs", variant: "indigo" },
  },
];

/** Full-bleed strip between heroes (warm neutral like reference) */
export const LANDING_QUOTE_STRIP = {
  text: "Everything rises and falls on leadership.",
} as const;

export const LANDING_INDONESIA_READY = {
  id: "indonesia-ready",
  title: "Get ready, Indonesia!",
  subtitle:
    "Be a part of raising 30 million leaders in Indonesia by 2045 Indonesia Emas!",
} as const;

export const LANDING_FEATURE_VIDEOS: LandingVideoEmbed[] = [
  {
    id: "v1",
    title: "JCM Launch Indonesia",
    youtubeId: "LXb3EKWsInQ",
  },
  {
    id: "v2",
    title: "JCM DT Launch Indonesia",
    youtubeId: "M7lc1UVf-VE",
  },
];

export const LANDING_IMC = {
  id: "imc",
  heroImage:
    "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=2400",
  eyebrowCta: {
    label: "Book David To Speak At Your Event",
    href: "#corporate",
  },
  title: "International Maxwell Conference",
  dateLine: "13–14 November 2025, Jakarta",
  body:
    "A two-day immersion with world-class faculty and practitioners — including John C. Maxwell, David Tjokrorahardjo, Chris Robinson, and Merry Riana — designed to stretch your thinking, sharpen your tools, and connect you with leaders who care about legacy, not just labels.",
} as const;

/** Row of 4 + optional wide row below (same container width) */
export const LANDING_GALLERY_TOP: LandingGalleryImage[] = [
  {
    id: "g1",
    src: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800",
    alt: "Leaders in a keynote hall",
  },
  {
    id: "g2",
    src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800",
    alt: "Conference networking",
  },
  {
    id: "g3",
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800",
    alt: "Workshop discussion",
  },
  {
    id: "g4",
    src: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    alt: "Team walking through venue",
  },
];

export const LANDING_GALLERY_WIDE: LandingGalleryImage = {
  id: "g-wide",
  src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=2000",
  alt: "Group photo after certification",
};

export const LANDING_TESTIMONIALS: LandingTestimonial[] = [
  {
    id: "t1",
    quote:
      "I was trained as an architect. Today, I'm also a Maxwell Leadership Certified Trainer. I realized that I can be both and continue to bring impact and transform lives! It was a struggle to invest in myself because I did not have other priorities. I am a better leader now because I took the challenge to increase my capacity. Now, I know where I am going and what I want to do for the rest of my life!",
    author: "Thomas Herman, Bandung",
  },
  {
    id: "t2",
    quote:
      "I was doing quite well being a business owner in Surabaya. I did not know my capacity until I took the challenge to invest in myself, join the Maxwell Mentorship in Jakarta and even went to IMC in Orlando! It changed my perspective and gave me a new confidence that I have never had before. I'm happier and so excited for my future as a certified coach!",
    author: "Myrica Hendarto, Surabaya",
  },
];

export const LANDING_FOOTER = {
  tagline: "Empower yourself and others to lead with purpose.",
  email: "info@maxwellleadershipindonesia.com",
  copyrightYear: 2025,
  socials: [
    {
      id: "ig",
      label: "Instagram",
      href: "https://instagram.com",
      icon: "instagram" as const,
    },
    {
      id: "li",
      label: "LinkedIn",
      href: "https://linkedin.com",
      icon: "linkedin" as const,
    },
    {
      id: "yt",
      label: "YouTube",
      href: "https://youtube.com",
      icon: "youtube" as const,
    },
  ] satisfies LandingFooterSocial[],
};
