export const footerLinks = [
  {
    label: "Privacy policy",
    href: process.env.NEXT_PUBLIC_PRIVACY_POLICY_PAGE_URL ?? "/privacy-policy",
  },
  {
    label: "Terms of service",
    href: process.env.NEXT_PUBLIC_TERMS_PAGE_URL ?? "/terms-of-service",
  },
  {
    label: "Contact Us",
    href: process.env.NEXT_PUBLIC_CONTACT_PAGE_URL ?? "/contact-us",
  },
];
