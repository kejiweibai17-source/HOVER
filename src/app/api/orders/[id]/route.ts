import { NextResponse } from "next/server";

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
  completed: "已完成",
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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  
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

    // 3. 整合回傳資料
    const processedData = {
      ...order,
      status_chinese: statusChinese, // 額外提供中文欄位
      payment_info: paymentInfo,     // 整理過的支付資訊
    };

    return NextResponse.json(processedData);
  } catch (err) {
    console.error("Fetch WC Order Error:", err);
    return NextResponse.json({ error: "無法獲取訂單" }, { status: 500 });
  }
}