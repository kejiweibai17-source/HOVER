"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SHIPPING,
  normalizeShippingSettings,
  type ShippingSettings,
} from "@/lib/shippingDefaults";

export function useShippingSettings(): ShippingSettings {
  const [settings, setSettings] = useState<ShippingSettings>(DEFAULT_SHIPPING);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shipping")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setSettings(normalizeShippingSettings(data?.shipping ?? data));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
