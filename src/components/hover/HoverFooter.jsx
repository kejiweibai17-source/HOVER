"use client";

import { useEffect, useState } from "react";
import { Link } from "next-view-transitions";
import HoverLogo from "@/components/hover/HoverLogo";
import HoverIcon from "@/components/hover/HoverIcon";
import { DEFAULT_FOOTER, normalizeFooterSettings } from "@/lib/footerDefaults";
import { getSvgLogoProxyUrl, isSvgLogo } from "@/lib/svgLogo";

function FooterAccordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/25">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-[15px] tracking-[0.12em]">{title}</span>
        <span className="text-[20px] font-light leading-none">
          {open ? "−" : "+"}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[480px] pb-4 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function FooterLink({ href, children, onClick }) {
  const external = href.startsWith("http");
  const className =
    "text-left text-[14px] tracking-[0.06em] text-white/90 transition-opacity hover:opacity-60";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-4 text-[17px] font-normal tracking-[0.1em] md:mb-5">
        {title}
      </h3>
      <ul className="space-y-2.5 md:space-y-3">
        {links.map((l) => (
          <li key={`${title}-${l.label}`}>
            <FooterLink href={l.href}>{l.label}</FooterLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterLogo({ logo, className = "" }) {
  const color = logo.color || "#ffffff";
  const svg = logo.url && isSvgLogo(logo.url, logo.mimeType);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [svgFailed, setSvgFailed] = useState(false);

  useEffect(() => {
    if (!logo.url || !svg) {
      setSvgMarkup("");
      setSvgFailed(false);
      return;
    }

    let cancelled = false;
    setSvgFailed(false);

    fetch(getSvgLogoProxyUrl(logo.url, color))
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.text();
      })
      .then((markup) => {
        if (!cancelled) setSvgMarkup(markup);
      })
      .catch(() => {
        if (!cancelled) {
          setSvgMarkup("");
          setSvgFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [logo.url, logo.mimeType, color, svg]);

  let content;
  if (logo.url) {
    if (svg && svgMarkup) {
      content = (
        <span
          className={`block w-full ${className}`}
          role="img"
          aria-label={logo.alt}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      );
    } else if (svg && !svgFailed) {
      content = <span className={`block ${className}`} aria-hidden />;
    } else {
      content = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo.url}
          alt={logo.alt}
          className={`block h-full w-full object-contain object-center ${className}`}
        />
      );
    }
  } else {
    content = <HoverLogo className={className} style={{ color }} aria-hidden />;
  }

  const href = logo.link || "/";
  const external = href.startsWith("http");

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-white"
        aria-label={logo.alt}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block text-white" aria-label={logo.alt}>
      {content}
    </Link>
  );
}

function SocialIcon({ item, size = 32 }) {
  if (item.iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.iconUrl}
        alt={item.label}
        width={size}
        height={size}
        className="inline-block object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  const iconName = ["line", "ig", "fb", "yt"].includes(item.icon)
    ? item.icon
    : "line";

  return <HoverIcon name={iconName} size={size} alt={item.label} />;
}

function SocialLinks({ items, size = 32 }) {
  return (
    <>
      {items.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target={s.href.startsWith("http") ? "_blank" : undefined}
          rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
          aria-label={s.label}
          className="inline-flex shrink-0 transition-opacity hover:opacity-70"
        >
          <SocialIcon item={s} size={size} />
        </a>
      ))}
    </>
  );
}

/** Split "© … Reserved. 公司 | 統編" into logo copyright + contact company line. */
function splitFooterLegal(copyright = "", companyInfo = "") {
  const match = copyright.match(/^(©\s*.*?All Rights Reserved\.?)\s*(.*)$/i);
  const shortCopyright = (match?.[1] || copyright).trim();
  const fromCopyright = (match?.[2] || "").trim();
  const company = (companyInfo || fromCopyright).trim();
  return { shortCopyright, company };
}

function ContactColumn({ contact, social }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-4 text-[17px] font-normal tracking-[0.1em] md:mb-5">
        {contact.title}
      </h3>
      <ul className="space-y-2.5 text-[13px] tracking-[0.04em] text-white/90 md:space-y-3">
        {contact.email && (
          <li>
            <a
              href={`mailto:${contact.email}`}
              className="block transition-opacity hover:opacity-60"
            >
              {contact.emailLabel || contact.email}
            </a>
          </li>
        )}
        {contact.hours && <li>{contact.hours}</li>}
        {contact.lineId && (
          <li>
            {contact.lineUrl ? (
              <a
                href={contact.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-60"
              >
                LINE ID: {contact.lineId}
              </a>
            ) : (
              <>LINE ID: {contact.lineId}</>
            )}
          </li>
        )}
      </ul>

      <div className="mt-5 flex items-center gap-2 md:mt-6">
        <SocialLinks items={social} size={40} />
      </div>
    </div>
  );
}

export default function HoverFooter() {
  const [footer, setFooter] = useState(DEFAULT_FOOTER);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/footer")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setFooter(normalizeFooterSettings(data?.footer));
      })
      .catch(() => {
        if (!cancelled) setFooter(DEFAULT_FOOTER);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { logo, backgroundColor, columns, contact, social, copyright } = footer;
  const { shortCopyright, company } = splitFooterLegal(
    copyright,
    contact.companyInfo,
  );

  return (
    <footer className="text-white" style={{ backgroundColor: backgroundColor || "#2a514d" }}>
      <div className="mx-auto w-full max-w-[1680px] px-6 pt-12 md:px-12 md:pt-16 lg:px-16 lg:pt-[72px] xl:px-12">
        <div className="hidden lg:flex lg:w-full lg:items-stretch lg:justify-evenly">
          <div className="flex shrink-0 items-center">
            <FooterLogo
              logo={logo}
              className="h-[100px] w-[220px] xl:h-[120px] xl:w-[260px]"
            />
          </div>

          <div className="w-px shrink-0 self-stretch bg-white/40" aria-hidden />

          {columns.map((col) => (
            <div key={col.title} className="shrink-0">
              <FooterColumn title={col.title} links={col.links} />
            </div>
          ))}

          <div className="shrink-0">
            <ContactColumn contact={contact} social={social} />
          </div>
        </div>

        <div className="lg:hidden">
          {columns.map((col) => (
            <FooterAccordion key={col.title} title={col.title}>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    <FooterLink href={l.href}>{l.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </FooterAccordion>
          ))}

          <FooterAccordion title={contact.title}>
            <ul className="space-y-2.5 text-[13px] tracking-[0.04em] text-white/90">
              {contact.email && (
                <li>
                  <a
                    href={`mailto:${contact.email}`}
                    className="block transition-opacity hover:opacity-60"
                  >
                    {contact.emailLabel || contact.email}
                  </a>
                </li>
              )}
              {contact.hours && <li>{contact.hours}</li>}
              {contact.lineId && (
                <li>
                  {contact.lineUrl ? (
                    <a
                      href={contact.lineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-opacity hover:opacity-60"
                    >
                      LINE ID: {contact.lineId}
                    </a>
                  ) : (
                    <>LINE ID: {contact.lineId}</>
                  )}
                </li>
              )}
              {company && <li>{company}</li>}
            </ul>
          </FooterAccordion>

          <div className="flex items-center gap-2 px-0 py-6">
            <SocialLinks items={social} size={40} />
          </div>

          <div className="mt-10 flex justify-center px-6 pb-4 pt-4 sm:mt-0">
            <FooterLogo logo={logo} className="h-16 w-full max-w-[240px]" />
          </div>

          {shortCopyright && (
            <p className="mx-auto max-w-[280px] pb-8 text-center text-[12px] leading-relaxed tracking-[0.04em] text-white/70">
              {shortCopyright}
            </p>
          )}
        </div>

        <div className="hidden pb-10 pt-16 text-center text-[12px] leading-relaxed tracking-[0.04em] text-white/70 md:mt-10 md:text-[13px] lg:block lg:pb-12 lg:pt-10">
          <p className="inline-flex flex-wrap items-center justify-center gap-x-2">
            {shortCopyright && <span>{shortCopyright}</span>}
            {company && shortCopyright && (
              <span className="text-white/40" aria-hidden>
                ·
              </span>
            )}
            {company && <span>{company}</span>}
          </p>
        </div>
      </div>
    </footer>
  );
}
