"use client";

import { useEffect, useState } from "react";
import { Link } from "next-view-transitions";
import HoverLogo from "@/components/hover/HoverLogo";
import HoverIcon from "@/components/hover/HoverIcon";
import {
  DEFAULT_FOOTER,
  normalizeFooterSettings,
} from "@/lib/footerDefaults";
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

function FooterLink({ href, children }) {
  const external = href.startsWith("http");
  const className =
    "text-[14px] tracking-[0.06em] text-white/90 transition-opacity hover:opacity-60";

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
      content = (
        <span
          className={`block ${className}`}
          aria-hidden
        />
      );
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
    content = (
      <HoverLogo className={className} style={{ color }} aria-hidden />
    );
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
        {contact.companyInfo && <li>{contact.companyInfo}</li>}
      </ul>

      <div className="mt-5 flex items-center gap-4 md:mt-6">
        <SocialLinks items={social} size={44} />
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

  return (
    <footer className="text-white" style={{ backgroundColor }}>
      <div className="mx-auto w-full max-w-[1680px] px-6 py-12 md:px-12 md:py-16 lg:px-16 lg:py-[72px] xl:px-12">
        <div className="hidden lg:flex lg:items-start">
          <div className="flex w-[26%] max-w-[300px] shrink-0 items-stretch gap-8 xl:gap-10">
            <div className="block min-w-0 flex-1 text-white">
              <FooterLogo
                logo={logo}
                className="h-[100px] w-full xl:h-[120px]"
              />
            </div>
            <div className="w-px shrink-0 bg-white/40" aria-hidden />
          </div>

          <div className="min-w-0 flex-1 pl-8 xl:pl-10">
            <div className="grid grid-cols-4 gap-x-6 xl:gap-x-10 2xl:gap-x-14">
              {columns.map((col) => (
                <FooterColumn
                  key={col.title}
                  title={col.title}
                  links={col.links}
                />
              ))}
              <ContactColumn contact={contact} social={social} />
            </div>
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
              {contact.companyInfo && <li>{contact.companyInfo}</li>}
            </ul>
          </FooterAccordion>

          <div className="flex items-center justify-center gap-5 py-8">
            <SocialLinks items={social} size={44} />
          </div>

          <div className="flex justify-center px-6 pb-6">
            <FooterLogo logo={logo} className="h-16 w-full max-w-[240px]" />
          </div>

          <p className="pb-2 text-center text-[12px] leading-relaxed tracking-[0.04em] text-white/70">
            {copyright}
          </p>
        </div>

        <div className="hidden border-t border-white/20 pt-8 text-center text-[12px] leading-relaxed tracking-[0.04em] text-white/70 lg:mt-12 lg:block md:text-[13px]">
          <p>{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
