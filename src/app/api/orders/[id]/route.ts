import { NextResponse } from "next/server";
import { getVerifiedMember, parseAdminEmails } from "@/lib/verifiedMember";

// 強制宣告為動態路由
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 訂單狀態對照表
 */
const STATUS_MAP: Record<string, string> = {
  pending: "待付款",
  processing: "處理中",
  "on-hold": "保留/等候中",
  completed: "已出貨",
  cancelled: "已取消",
  refunded: "已退款",
  failed: "付款失敗",
  "checkout-draft": "結帳草稿",
};

/**
 * 從 meta_data 中提取支付資訊 (超商/ATM)
 */
function extractPaymentInfo(metaData: any[]) {
  const info: Record<string, string> = {};
  if (!Array.isArray(metaData)) return null;

  metaData.forEach((item: any) => {
    const key = String(item.key || "").toLowerCase();
    const val = Array.isArray(item.value) ? String(item.value[0]) : String(item.value || "");
    if (!val) return;
    if (key.includes("vaccount") || key.includes("virtual_account") || key.includes("atm_account")) {
      info.atm_account = val;
    }
    if (key.includes("bankcode") || key.includes("bank_code") || key.includes("atm_bank")) {
      info.bank_code = val;
    }
    if (key.includes("paymentno") || key.includes("cvs_payment") || key.includes("cvscode") || key.includes("pay_no")) {
      info.cvs_code = val;
    }
    if (key.includes("expiredate") || key.includes("expire_date") || key.includes("duedate")) {
      info.expire_date = val;
    }
  });

  return Object.keys(info).length > 0 ? info : null;
}

function maskEmail(raw: unknown): string {
  const s = String(raw || "").trim();
  const at = s.indexOf("@");
  if (at < 1) return "";
  return `${s.slice(0, 1)}***${s.slice(at)}`;
}

function maskPhone(raw: unknown): string {
  const s = String(raw || "").replace(/\s+/g, "");
  if (s.length < 4) return "";
  return `${s.slice(0, 2)}****${s.slice(-2)}`;
}

function maskName(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  return `${s.slice(0, 1)}**`;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  // orderId 只允許純數字，避免被拿來組出其他 WC API 路徑
  if (!/^\d{1,12}$/.test(String(id || ""))) {
    return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
  }
  
  const BASE = process.env.WC_API_BASE;
  const CK = process.env.WC_CONSUMER_KEY;
  const CS = process.env.WC_CONSUMER_SECRET;

  if (!BASE || !CK || !CS) {
    return NextResponse.json({ error: "伺服器配置錯誤" }, { status: 500 });
  }

  const auth = "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");

  try {
    const res = await fetch(`${BASE.replace(/\/$/, "")}/wp-json/wc/v3/orders/${id}`, {
      headers: { Authorization: auth },
      cache: "no-store", 
    });

    if (!res.ok) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }

    const order = await res.json();

    // --- 💡 資料二次加工 ---
    
    // 1. 轉換中文狀態
    const statusChinese = STATUS_MAP[order.status] || order.status;

    // 2. 提取待付款資訊 (超商/ATM)
    const paymentInfo = extractPaymentInfo(order.meta_data || []);

    // 3. 判斷呼叫者是否為訂單本人（或管理員）：只信任有簽章的登入身分
    let canSeeFull = false;
    try {
      const member = await getVerifiedMember();
      const billingEmail = String(order?.billing?.email || "")
        .trim()
        .toLowerCase();
      const orderCustomerId = Number(order?.customer_id || 0);
      const isOwner =
        (!!member.email && !!billingEmail && member.email === billingEmail) ||
        (!!member.customerId &&
          orderCustomerId > 0 &&
          member.customerId === orderCustomerId);
      const isAdmin =
        !!member.email && parseAdminEmails().includes(member.email);
      canSeeFull = isOwner || isAdmin;
    } catch {
      canSeeFull = false;
    }

    if (canSeeFull) {
      // 訂單本人：維持原本完整回傳
      return NextResponse.json({
        ...order,
        status_chinese: statusChinese, // 額外提供中文欄位
        payment_info: paymentInfo, // 整理過的支付資訊
      });
    }

    // 訪客（例如金流導回的感謝頁）：orderId 為流水號可被列舉，
    // 只回感謝頁／付款資訊所需的最小欄位，個資一律遮罩。
    return NextResponse.json({
      id: order.id,
      number: order.number,
      status: order.status,
      status_chinese: statusChinese,
      currency: order.currency,
      total: order.total,
      date_paid: order.date_paid ?? null,
      date_completed: order.date_completed ?? null,
      payment_method: order.payment_method,
      payment_method_title: order.payment_method_title,
      payment_info: paymentInfo,
      line_items: Array.isArray(order.line_items)
        ? order.line_items.map((it: any) => ({
            id: it.id,
            name: it.name,
            quantity: it.quantity,
            total: it.total,
          }))
        : [],
      billing: {
        email: maskEmail(order?.billing?.email),
        first_name: "",
        last_name: maskName(
          `${order?.billing?.last_name || ""}${order?.billing?.first_name || ""}`,
        ),
        phone: maskPhone(order?.billing?.phone),
      },
    });
  } catch (err) {
    console.error("Fetch WC Order Error:", err);
    return NextResponse.json({ error: "無法獲取訂單" }, { status: 500 });
  }
}