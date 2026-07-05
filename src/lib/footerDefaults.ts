export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export type FooterSocial = {
  label: string;
  href: string;
  icon: string;
  iconUrl?: string;
};

export type FooterSettings = {
  logo: {
    url: string;
    alt: string;
    link: string;
    color: string;
    mimeType?: string;
  };
  backgroundColor: string;
  columns: FooterColumn[];
  contact: {
    title: string;
    email: string;
    emailLabel: string;
    hours: string;
    lineId: string;
    lineUrl: string;
    companyInfo: string;
  };
  social: FooterSocial[];
  mobileSocialTitle: string;
  copyright: string;
};

export const DEFAULT_FOOTER: FooterSettings = {
  logo: {
    url: "",
    alt: "HOVER",
    link: "/",
    color: "#ffffff",
    mimeType: "",
  },
  backgroundColor: "#2a514d",
  columns: [
    {
      title: "關於我們",
      links: [
        { label: "品牌故事", href: "/brand" },
        {
          label: "最新消息",
          href: "https://www.instagram.com/hover.tw?igsh=ODFwaXZmam5kOXJn",
        },
      ],
    },
    {
      title: "顧客服務",
      links: [
        { label: "會員制度", href: "/membership" },
        { label: "如何購買", href: "/how-to-buy" },
        { label: "申請退貨", href: "/returns" },
        { label: "常見問題", href: "/faq" },
      ],
    },
    {
      title: "政策條款",
      links: [
        { label: "服務條款", href: "/terms" },
        { label: "隱私權保護", href: "/privacy" },
      ],
    },
  ],
  contact: {
    title: "聯絡我們",
    email: "service@hoverofficial.com",
    emailLabel: "SERVICE@HOVEROFFICIAL.COM",
    hours: "MON.-FRI. 10:00-19:00",
    lineId: "@HOVER",
    lineUrl: "https://line.me/R/ti/p/@330kefmm",
    companyInfo: "停機坪國際文創股份有限公司 | 90230279",
  },
  social: [
    {
      label: "LINE",
      href: "https://line.me/R/ti/p/@330kefmm",
      icon: "line",
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/hover.tw?igsh=ODFwaXZmam5kOXJn",
      icon: "ig",
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/share/1EhyidjLHK/?mibextid=wwXIfr",
      icon: "fb",
    },
    { label: "YouTube", href: "#", icon: "yt" },
  ],
  mobileSocialTitle: "追蹤我們",
  copyright: "© 2026 HOVER. All Rights Reserved.",
};

export function normalizeFooterSettings(raw: unknown): FooterSettings {
  const d = DEFAULT_FOOTER;
  if (!raw || typeof raw !== "object") return d;

  const o = raw as Record<string, unknown>;
  const logoRaw = (o.logo as Record<string, unknown>) || {};
  const contactRaw = (o.contact as Record<string, unknown>) || {};

  const columns = Array.isArray(o.columns)
    ? (o.columns as FooterColumn[])
        .map((col) => ({
          title: String(col?.title || "").trim(),
          links: Array.isArray(col?.links)
            ? col.links
                .map((link) => ({
                  label: String(link?.label || "").trim(),
                  href: String(link?.href || "").trim(),
                }))
                .filter((link) => link.label && link.href)
            : [],
        }))
        .filter((col) => col.title)
    : d.columns;

  const social = Array.isArray(o.social)
    ? (o.social as Record<string, unknown>[])
        .map((item) => ({
          label: String(item?.label || "").trim(),
          href: String(item?.href || "").trim(),
          icon: String(item?.icon || "line").trim(),
          iconUrl: String(item?.iconUrl || item?.icon_url || "").trim(),
        }))
        .filter((item) => item.label)
    : d.social;

  return {
    logo: {
      url: String(logoRaw.url || "").trim(),
      alt: String(logoRaw.alt || d.logo.alt).trim(),
      link: String(logoRaw.link || d.logo.link).trim(),
      color: String(logoRaw.color || d.logo.color).trim() || d.logo.color,
      mimeType: String(
        logoRaw.mimeType || logoRaw.mime_type || d.logo.mimeType || "",
      ).trim(),
    },
    backgroundColor: String(o.backgroundColor || o.background_color || d.backgroundColor),
    columns: columns.length > 0 ? columns : d.columns,
    contact: {
      title: String(contactRaw.title || d.contact.title).trim(),
      email: String(contactRaw.email || d.contact.email).trim(),
      emailLabel: String(
        contactRaw.emailLabel || contactRaw.email_label || d.contact.emailLabel,
      ).trim(),
      hours: String(contactRaw.hours || d.contact.hours).trim(),
      lineId: String(contactRaw.lineId || contactRaw.line_id || d.contact.lineId).trim(),
      lineUrl: String(contactRaw.lineUrl || contactRaw.line_url || d.contact.lineUrl).trim(),
      companyInfo: String(
        contactRaw.companyInfo || contactRaw.company_info || d.contact.companyInfo,
      ).trim(),
    },
    social: social.length > 0 ? social : d.social,
    mobileSocialTitle: String(
      o.mobileSocialTitle || o.mobile_social_title || d.mobileSocialTitle,
    ).trim(),
    copyright: String(o.copyright || d.copyright).trim(),
  };
}
