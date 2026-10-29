"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** 提高 z-index（購物車側欄很大） */
  zIndexClassName?: string;
};

/**
 * 輕量確認彈窗（刪除購物車商品等）
 */
export default function ConfirmDialog({
  open,
  title = "請確認",
  message,
  confirmLabel = "確定刪除",
  cancelLabel = "取消",
  onConfirm,
  onCancel,
  zIndexClassName = "z-[100000]",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/45 px-5 ${zIndexClassName}`}
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hover-confirm-title"
        aria-describedby="hover-confirm-desc"
        className="w-full max-w-[360px] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="hover-confirm-title"
          className="text-[16px] font-semibold text-black"
        >
          {title}
        </h3>
        <p
          id="hover-confirm-desc"
          className="mt-3 text-[14px] leading-relaxed text-[#555]"
        >
          {message}
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[40px] px-4 text-[13px] text-[#666] transition-colors hover:text-black"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[40px] bg-[#2a514d] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#1e3d3a]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
