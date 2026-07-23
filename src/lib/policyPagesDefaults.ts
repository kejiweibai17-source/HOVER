import type { PolicySection } from "@/components/hover/PolicyAccordion";

export type PolicyPageKey = "how-to-buy" | "returns" | "faq";

export type PolicyPageSettings = {
  pageTitle: string;
  intro: string;
  contentColor: string;
  sections: PolicySection[];
};

export type PolicyPagesBundle = Record<PolicyPageKey, PolicyPageSettings>;

export const DEFAULT_POLICY_PAGES: PolicyPagesBundle = {
  "how-to-buy": {
    "pageTitle": "如何購買",
    "intro": "",
    "contentColor": "#2a514d",
    "sections": [
      {
        "num": "01",
        "title": "購物流程",
        "items": [
          {
            "title": "登入會員",
            "collapsible": true,
            "contentHtml": "<p>點選會員圖示，登入或註冊 HOVER 會員帳號。</p>"
          },
          {
            "title": "選擇商品",
            "collapsible": true,
            "contentHtml": "<p>選擇您喜歡的商品，確認顏色、尺寸與數量後，加入購物袋。</p>"
          },
          {
            "title": "確認訂單",
            "collapsible": true,
            "contentHtml": "<p>點選右上角購物袋，確認訂單內容、配送方式與付款方式。</p>"
          },
          {
            "title": "完成結帳",
            "collapsible": true,
            "contentHtml": "<p>完成結帳後，您可至會員中心查看訂單紀錄與配送狀態。</p>"
          },
          {
            "title": "貼心提醒",
            "collapsible": true,
            "contentHtml": "<ul><li>商品加入購物袋後，系統尚不會保留庫存；實際庫存將以完成結帳之順序為準。</li><li>若訂單內同時包含現貨與預購商品，建議您分開結帳。現貨商品將依正常出貨時間安排寄出；預購商品則依商品頁標示之預計到貨時間陸續出貨。</li><li>預購商品之到貨時間可能受製作排程、物流配送、海關檢驗或其他不可抗力因素影響。若商品提前到貨，HOVER 將盡快為您安排出貨。</li></ul>"
          }
        ]
      },
      {
        "num": "02",
        "title": "付款方式",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 目前提供以下付款方式：</p>"
          },
          {
            "title": "信用卡線上付款",
            "collapsible": true,
            "contentHtml": "<p>HOVER 使用綠界科技金流服務，支援 VISA、MasterCard、JCB 等信用卡付款方式。</p><p>實際可使用之卡別，將依結帳頁面顯示為準。</p>"
          },
          {
            "title": "ATM 虛擬帳號轉帳",
            "collapsible": true,
            "contentHtml": "<p>選擇 ATM 虛擬帳號付款後，系統將自動產生一組專屬付款資訊，包含銀行代碼、虛擬帳號、付款金額與繳費期限。</p><p>請於期限內透過網路銀行、手機銀行或 ATM 機台完成付款。付款完成後，系統將自動更新訂單狀態，無需另外回報匯款後五碼。</p><p>若逾期未付款，訂單將自動取消，請重新下單。</p>"
          }
        ]
      },
      {
        "num": "03",
        "title": "配送方式",
        "items": [
          {
            "title": "超商取貨｜不付款",
            "collapsible": true,
            "contentHtml": "<p>HOVER 目前提供超商取貨服務。當商品送達您指定的超商門市後，系統將發送取貨通知，請您於簡訊或物流系統指定期限內完成取貨。</p><p>實際可選擇之超商門市與配送方式，將依結帳頁面顯示為準。</p>"
          },
          {
            "title": "運費說明",
            "collapsible": true,
            "contentHtml": "<p>超商取貨運費為 NT$80。</p><p>若有免運優惠或期間限定活動，將依官網公告與結帳頁面顯示內容為準。</p>"
          }
        ]
      },
      {
        "num": "04",
        "title": "出貨與配送時間",
        "items": [
          {
            "title": "現貨商品",
            "collapsible": true,
            "contentHtml": "<p>現貨商品於付款完成後，約 1–3 個工作日安排出貨，不含例假日與國定假日。</p>"
          },
          {
            "title": "配送時間",
            "collapsible": true,
            "contentHtml": "<p>包裹出貨後，約 2–4 個工作日送達指定超商門市。實際配送時間可能因物流量、門市作業、天候或其他不可抗力因素而有所調整。</p>"
          },
          {
            "title": "特殊情況",
            "collapsible": true,
            "contentHtml": "<p>若遇訂單量較多、連續假期或特殊活動期間，出貨時間可能略有延遲。實際出貨狀態請以您收到的出貨通知為準。</p>"
          }
        ]
      },
      {
        "num": "05",
        "title": "訂單注意事項",
        "items": [
          {
            "title": "物流異常",
            "collapsible": true,
            "contentHtml": "<p>若包裹發生異常配送、門市關轉、逾期未取或其他物流問題，HOVER 客服將視情況與您聯繫協助處理。</p>"
          },
          {
            "title": "未取與異常交易",
            "collapsible": true,
            "contentHtml": "<p>若帳號多次發生無故未取、拒收或異常交易情形，HOVER 將視情況暫停該帳號部分交易服務，以維護雙方交易權益。</p>"
          },
          {
            "title": "訂單諮詢",
            "collapsible": true,
            "contentHtml": "<p>如您對訂單、付款或配送狀態有任何疑問，歡迎透過官方客服與我們聯繫。</p>"
          }
        ]
      },
      {
        "num": "06",
        "title": "防詐騙提醒",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 不會主動來電要求您操作 ATM、提供銀行帳戶、信用卡資料或購買點數。</p><p>若您接獲可疑電話、簡訊或不明連結，請勿依照指示操作，並請立即與 HOVER 官方客服確認，或撥打 165 反詐騙諮詢專線。</p>"
          }
        ]
      }
    ]
  },
  "returns": {
    "pageTitle": "申請退貨",
    "intro": "HOVER 希望每一次購買都能讓您安心。若您收到商品後有退貨需求，請依照以下說明提出申請，我們將協助您完成退貨流程。",
    "contentColor": "#2a514d",
    "sections": [
      {
        "num": "01",
        "title": "退貨通知",
        "items": [
          {
            "title": "退貨服務",
            "collapsible": true,
            "contentHtml": "<p>HOVER 目前提供退貨服務，暫不提供換貨。</p><p>如需更換尺寸、顏色或款式，請重新下單選購。</p>"
          },
          {
            "title": "申請期限",
            "collapsible": true,
            "contentHtml": "<p>如欲辦理退貨，請於收到商品次日起 7 日內，透過 HOVER 官方客服提出退貨申請。</p><p>逾期提出申請者，恕無法受理退貨。</p>"
          },
          {
            "title": "申請方式",
            "collapsible": true,
            "contentHtml": "<p>退貨申請須先聯繫 HOVER 官方客服確認。</p><p>未經客服確認而自行寄回之商品，將無法完成退貨流程；如需重新寄回，相關費用將由消費者自行負擔。</p>"
          },
          {
            "title": "退貨運費",
            "collapsible": true,
            "contentHtml": "<p>於 7 日鑑賞期內申請退貨，HOVER 將依相關法規協助辦理退貨流程。同筆訂單申請二次以上退貨服務，運費80元請自行負擔。</p><p>若因退貨資料不完整、退貨代碼逾期失效、未依客服指示寄回，或同筆訂單重複申請造成額外物流、行政或處理成本，HOVER 將由客服個案說明後續處理方式。</p>"
          }
        ]
      },
      {
        "num": "02",
        "title": "退貨申請流程",
        "items": [
          {
            "title": "聯繫客服",
            "collapsible": true,
            "contentHtml": "<p>請登入 HOVER 會員中心，進入訂單查詢後，點選聯繫客服提出退貨申請。</p>"
          },
          {
            "title": "確認退貨資訊",
            "collapsible": true,
            "contentHtml": "<p>客服將協助確認訂單資料、退貨商品與退貨原因，並提供後續退貨方式。</p>"
          },
          {
            "title": "取得退貨代碼",
            "collapsible": true,
            "contentHtml": "<p>退貨申請成立後，客服將提供退貨代碼與操作說明。</p>"
          },
          {
            "title": "超商寄回",
            "collapsible": true,
            "contentHtml": "<p>請依客服提供之退貨方式，至指定超商機台列印退貨單，並將包裹交由櫃台人員寄回。</p>"
          },
          {
            "title": "保留收據",
            "collapsible": true,
            "contentHtml": "<p>完成寄件後，請妥善保留寄件收據，直到退貨與退款流程完成。</p>"
          }
        ]
      },
      {
        "num": "03",
        "title": "超商退貨說明",
        "items": [
          {
            "title": "超商退貨",
            "collapsible": true,
            "contentHtml": "<p>退貨申請成立後，客服將提供退貨代碼與操作說明。請依客服提供之退貨方式至指定超商辦理退貨。</p>"
          },
          {
            "title": "操作說明",
            "collapsible": true,
            "contentHtml": "<p>可依實際退貨方式，參考以下超商退貨操作說明：</p><p><a href=\"https://www.7-11.com.tw/service/return.aspx\" target=\"_blank\" rel=\"noopener noreferrer\">7-ELEVEN 退貨操作說明</a></p><p><a href=\"https://www.famiport.com.tw/Web_Famiport/page/fp_operating.aspx?MN=5&amp;CN=1078\" target=\"_blank\" rel=\"noopener noreferrer\">全家退貨操作說明</a></p>"
          },
          {
            "title": "包裹尺寸限制",
            "collapsible": true,
            "contentHtml": "<p>超商退貨包裹須符合物流材積與重量限制。實際限制將依各超商與物流系統規範為準；若包裹尺寸超出限制，客服將協助提供其他退貨方式。</p>"
          }
        ]
      },
      {
        "num": "04",
        "title": "退貨商品狀態",
        "items": [
          {
            "title": "商品完整性",
            "collapsible": true,
            "contentHtml": "<p>退貨商品須保持全新、未使用、未下水、無異味、無髒污，並保留完整包裝、吊牌、配件、贈品與出貨相關文件。</p>"
          },
          {
            "title": "包裝完整性",
            "collapsible": true,
            "contentHtml": "<p>請將商品以原包裝或適當包材妥善包裝後寄回。若無原外箱，可使用不透明包裝袋或紙箱寄回，並請避免商品於運送過程中受損。</p>"
          },
          {
            "title": "瑕疵或寄錯商品",
            "collapsible": true,
            "contentHtml": "<p>若您收到的商品有缺件、寄錯或明顯瑕疵，請保留商品、包裝與相關照片或影片，並儘速聯繫客服協助確認。</p>"
          }
        ]
      },
      {
        "num": "05",
        "title": "無法退貨情形",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>以下情況恕無法辦理退貨：</p><p>若商品本身有瑕疵或寄錯錯誤，請於收到商品後儘速聯繫客服協助處理。</p><ul><li>超過 7 日鑑賞期。</li><li>未先聯繫客服申請，或退貨代碼逾期失效。</li><li>商品已使用、下水、清洗、修改或有穿著痕跡。</li><li>商品沾有粉底、口紅、香水、菸味、衣物芳香劑或其他明顯異味。</li><li>商品有刮傷、破損、髒污，或因人為因素造成非原始狀態。</li><li>商品包裝不完整，包含吊牌已剪、配件遺失、贈品未歸還、原包裝遺失或損壞。</li><li>基於個人衛生考量，襪子、貼身衣物等個人衛生用品，如已拆封、試穿、使用或包裝不完整，恕無法辦理退貨。</li><li>其他依商品性質、法令規定或客服確認後不符合退貨條件之情形。</li></ul>"
          }
        ]
      },
      {
        "num": "06",
        "title": "退款方式與時間",
        "items": [
          {
            "title": "信用卡付款",
            "collapsible": true,
            "contentHtml": "<p>若原訂單使用信用卡付款，退款將以刷退方式退回原付款信用卡。實際入帳時間將依各發卡銀行作業時間而有所不同。</p>"
          },
          {
            "title": "ATM 虛擬帳號付款",
            "collapsible": true,
            "contentHtml": "<p>若原訂單使用 ATM 虛擬帳號付款，客服將協助確認退款帳戶資訊。待退貨商品確認無誤後，將依流程安排退款。</p>"
          },
          {
            "title": "退款時間",
            "collapsible": true,
            "contentHtml": "<p>HOVER 收到退貨商品並確認商品狀態無誤後，約 7-14 個工作日內完成退款作業。實際入帳時間仍依銀行、信用卡公司或金流作業時間為準。</p>"
          }
        ]
      },
      {
        "num": "07",
        "title": "貼心提醒",
        "items": [
          {
            "title": "開箱紀錄",
            "collapsible": true,
            "contentHtml": "<p>為保障雙方權益，建議您於開箱時全程錄影。若商品有缺件、寄錯或明顯瑕疵，照片與影片將有助於客服加速確認。</p>"
          },
          {
            "title": "尺寸與色差",
            "collapsible": true,
            "contentHtml": "<p>商品尺寸皆為人工平量，與實際商品可能有約 ±2cm 誤差，屬正常範圍。不同螢幕、手機與拍攝光線可能造成些微色差，實際顏色請以收到商品為準。</p>"
          },
          {
            "title": "非瑕疵範圍",
            "collapsible": true,
            "contentHtml": "<p>線頭、輕微脫線、衣物壓痕、些微混線、輕微溢膠或殘膠，皆可能因製程、運送或包裝產生。若不影響商品穿著與使用，原則上不屬於瑕疵範圍。</p>"
          },
          {
            "title": "商品氣味",
            "collapsible": true,
            "contentHtml": "<p>布料、印刷或染劑可能因包裝密封產生些微氣味。建議收到後置於通風處，氣味通常會逐漸淡化。</p>"
          },
          {
            "title": "異常交易處理",
            "collapsible": true,
            "contentHtml": "<p>若帳號多次發生異常退貨、頻繁取消訂單、無故未取、拒收、退貨資料不完整或違反交易規則之情形，HOVER 將視情況暫停該帳號部分交易服務，或保留接受後續訂單之權利。</p>"
          }
        ]
      }
    ]
  },
  "faq": {
    "pageTitle": "常見問題",
    "intro": "",
    "contentColor": "#2a514d",
    "sections": [
      {
        "num": "01",
        "title": "客服與訂單",
        "items": [
          {
            "title": "如何聯繫客服？",
            "collapsible": true,
            "contentHtml": "<p>您可透過 HOVER 官方客服信箱或官方 LINE 與我們聯繫。客服時間為週一至週五 10:00–19:00，例假日與國定假日暫停服務。客服將依訊息順序回覆，感謝您的耐心等候。</p>"
          },
          {
            "title": "訂單可以合併嗎？",
            "collapsible": true,
            "contentHtml": "<p>為確保訂單、付款與出貨資料正確，HOVER 目前不提供併單服務。若您有多筆訂單，將依各筆訂單成立順序分別安排出貨。</p>"
          },
          {
            "title": "下單完成後，可以修改訂單內容嗎？",
            "collapsible": true,
            "contentHtml": "<p>訂單成立後，系統將依訂單內容進行後續處理，恕無法直接修改商品、尺寸、顏色、數量或配送方式。如需調整訂單，請儘速聯繫 HOVER 官方客服，我們將依訂單狀態協助確認是否可取消後重新下單。</p>"
          }
        ]
      },
      {
        "num": "02",
        "title": "商品與出貨",
        "items": [
          {
            "title": "請問商品有現貨嗎？",
            "collapsible": true,
            "contentHtml": "<p>HOVER 目前販售商品以現貨為主。現貨商品於付款完成後，約 1–3 個工作日安排出貨，不含例假日與國定假日。實際庫存仍以完成結帳當下之系統顯示為準。</p>"
          },
          {
            "title": "請問預購商品要等多久？",
            "collapsible": true,
            "contentHtml": "<p>若商品為預購商品，HOVER 將於商品頁標示預計出貨時間。預購商品之到貨時間可能因製作排程、物流配送、海關檢驗或其他不可抗力因素而有所調整；若商品提前到貨，HOVER 將盡快安排出貨。</p>"
          },
          {
            "title": "現貨與預購商品可以一起下單嗎？",
            "collapsible": true,
            "contentHtml": "<p>若訂單內同時包含現貨與預購商品，建議您分開結帳。若一併下單，訂單將待預購商品全數到貨後再一併安排出貨。</p>"
          }
        ]
      },
      {
        "num": "03",
        "title": "付款與發票",
        "items": [
          {
            "title": "下單完成後，可以更改付款方式嗎？",
            "collapsible": true,
            "contentHtml": "<p>訂單成立後，系統無法直接變更付款方式。如需更換付款方式，請重新下單，並聯繫 HOVER 官方客服協助取消原訂單。</p>"
          },
          {
            "title": "HOVER 會開立發票嗎？",
            "collapsible": true,
            "contentHtml": "<p>HOVER 採用電子發票服務。訂單付款完成後，系統將依您結帳時填寫的發票資訊開立電子發票，並寄送發票開立通知至您的 Email 信箱。</p>"
          },
          {
            "title": "可以開立公司戶發票嗎？",
            "collapsible": true,
            "contentHtml": "<p>可以。若需開立公司戶發票，請於結帳時填寫統一編號與公司抬頭。發票一經開立，恕無法任意更改發票類型、統一編號或抬頭資訊，請於送出訂單前再次確認。</p>"
          },
          {
            "title": "包裹內會附紙本發票嗎？",
            "collapsible": true,
            "contentHtml": "<p>HOVER 採用電子發票，包裹內不另附紙本發票。如需發票證明，請聯繫 HOVER 官方客服協助處理。</p>"
          }
        ]
      },
      {
        "num": "04",
        "title": "退貨相關",
        "items": [
          {
            "title": "HOVER 可以換貨嗎？",
            "collapsible": true,
            "contentHtml": "<p>HOVER 目前提供退貨服務，暫不提供換貨。如需更換尺寸、顏色或款式，請重新下單選購。</p>"
          },
          {
            "title": "收到商品後可以退貨嗎？",
            "collapsible": true,
            "contentHtml": "<p>如欲辦理退貨，請於收到商品次日起 7 日內，透過 HOVER 官方客服提出退貨申請。退貨商品須保持全新、未使用、未下水、無異味、無髒污，並保留完整包裝、吊牌、配件與贈品。</p>"
          },
          {
            "title": "如果收到瑕疵品或寄錯商品怎麼辦？",
            "collapsible": true,
            "contentHtml": "<p>若您收到的商品有缺件、寄錯或明顯瑕疵，請保留商品、包裝與相關照片或影片，並儘速聯繫 HOVER 官方客服協助確認。</p>"
          },
          {
            "title": "襪子可以退貨嗎？",
            "collapsible": true,
            "contentHtml": "<p>基於個人衛生考量，襪子、貼身衣物等個人衛生用品，如已拆封、試穿、使用或包裝不完整，恕無法辦理退貨。若商品本身有瑕疵或寄送錯誤，請於收到商品後儘速聯繫客服協助處理。</p>"
          }
        ]
      },
      {
        "num": "05",
        "title": "商品保養",
        "items": [
          {
            "title": "衣物如何清洗與保養？",
            "collapsible": true,
            "contentHtml": "<p>建議依照商品洗滌標示清洗。一般衣物建議翻面清洗、使用中性洗劑，並放入洗衣袋以降低摩擦與變形。</p>"
          },
          {
            "title": "可以烘乾或長時間曝曬嗎？",
            "collapsible": true,
            "contentHtml": "<p>不建議使用烘乾機或長時間陽光直曬，以免造成衣物縮水、變形或褪色。洗滌後建議陰涼通風自然晾乾。</p>"
          },
          {
            "title": "深色衣物需要注意什麼？",
            "collapsible": true,
            "contentHtml": "<p>深色衣物建議與淺色衣物分開洗滌，並避免與淺色包款或配件長時間摩擦，以降低移染可能。</p>"
          },
          {
            "title": "商品尺寸會有誤差嗎？",
            "collapsible": true,
            "contentHtml": "<p>商品尺寸皆為人工平量，與實際商品可能有約 ±2cm 誤差，屬正常範圍。</p>"
          }
        ]
      }
    ]
  }
};

function asString(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

function parseBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return fallback;
}

function normalizeHexColor(value: unknown, fallback: string): string {
  const raw = asString(value, fallback);
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const a = raw[1];
    const b = raw[2];
    const c = raw[3];
    return `#${a}${a}${b}${b}${c}${c}`;
  }
  return fallback;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linesToHtml(lines: string[], tag: "p" | "li"): string {
  if (tag === "p") {
    return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  }
  if (!lines.length) return "";
  return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
}

function normalizeItem(raw: unknown): PolicySection["items"][number] | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = asString(o.title);
  let contentHtml = "";
  if (typeof o.contentHtml === "string") contentHtml = o.contentHtml;
  else if (typeof o.content === "string") contentHtml = o.content;
  else {
    const paragraphs = Array.isArray(o.paragraphs)
      ? o.paragraphs.map((p) => asString(p)).filter(Boolean)
      : [];
    const list = Array.isArray(o.list)
      ? o.list.map((p) => asString(p)).filter(Boolean)
      : [];
    contentHtml = linesToHtml(paragraphs, "p") + linesToHtml(list, "li");
    if (Array.isArray(o.links)) {
      contentHtml += o.links
        .map((link) => {
          if (!link || typeof link !== "object") return "";
          const l = link as Record<string, unknown>;
          const label = asString(l.label);
          const href = asString(l.href);
          if (!label || !href) return "";
          return `<p><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></p>`;
        })
        .join("");
    }
  }
  if (!title && !contentHtml.replace(/<[^>]+>/g, "").trim()) return null;
  return {
    title,
    titleColor: normalizeHexColor(
      o.titleColor ?? o.title_color,
      "#0f172a",
    ),
    collapsible: parseBool(o.collapsible, Boolean(title)),
    contentHtml,
  };
}

function legacyToItems(o: Record<string, unknown>): PolicySection["items"] {
  if (Array.isArray(o.items)) {
    return o.items.map(normalizeItem).filter(Boolean) as PolicySection["items"];
  }

  const items: PolicySection["items"] = [];
  const subs = Array.isArray(o.subSections)
    ? o.subSections
    : Array.isArray(o.sub_sections)
      ? o.sub_sections
      : [];

  if (subs.length) {
    for (const sub of subs) {
      const item = normalizeItem(sub);
      if (item) {
        item.collapsible = parseBool(
          (sub as Record<string, unknown>)?.collapsible,
          true,
        );
        items.push(item);
      }
    }
    return items;
  }

  // flat heading + contentHtml model
  if (typeof o.contentHtml === "string" || typeof o.content === "string") {
    const html = String(o.contentHtml ?? o.content ?? "");
    const heading = asString(o.heading);
    if (heading || html.replace(/<[^>]+>/g, "").trim()) {
      items.push({
        title: heading,
        titleColor: "#0f172a",
        collapsible: false,
        contentHtml: html,
      });
    }
    return items;
  }

  const paragraphs = Array.isArray(o.paragraphs)
    ? o.paragraphs.map((p) => asString(p)).filter(Boolean)
    : [];
  const list = Array.isArray(o.list)
    ? o.list.map((p) => asString(p)).filter(Boolean)
    : [];
  const html = linesToHtml(paragraphs, "p") + linesToHtml(list, "li");
  if (html) {
    items.push({
      title: "",
      titleColor: "#0f172a",
      collapsible: false,
      contentHtml: html,
    });
  }
  return items;
}

function normalizeSection(raw: unknown, index: number): PolicySection | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = asString(o.title);
  if (!title) return null;

  // 舊版導言 → 併入內層第一項（不收折）
  let items = legacyToItems(o);
  const introHtml =
    typeof o.introHtml === "string"
      ? o.introHtml
      : typeof o.intro_html === "string"
        ? o.intro_html
        : "";
  if (introHtml.replace(/<[^>]+>/g, "").trim()) {
    items = [
      {
        title: "",
        titleColor: "#0f172a",
        collapsible: false,
        contentHtml: introHtml,
      },
      ...items,
    ];
  }

  return {
    num: asString(o.num) || String(index + 1).padStart(2, "0"),
    title,
    titleColor: normalizeHexColor(o.titleColor ?? o.title_color, "#4b5563"),
    items,
  };
}

export function normalizePolicyPage(
  raw: unknown,
  key: PolicyPageKey,
): PolicyPageSettings {
  const fallback = DEFAULT_POLICY_PAGES[key];
  if (!raw || typeof raw !== "object") return fallback;

  const o = raw as Record<string, unknown>;
  const sections = Array.isArray(o.sections)
    ? o.sections
        .map((section, index) => normalizeSection(section, index))
        .filter(Boolean)
    : fallback.sections;

  return {
    pageTitle:
      asString(o.pageTitle ?? o.page_title, fallback.pageTitle) ||
      fallback.pageTitle,
    intro: asString(o.intro, fallback.intro),
    contentColor: normalizeHexColor(
      o.contentColor ?? o.content_color,
      fallback.contentColor,
    ),
    sections: (sections.length ? sections : fallback.sections) as PolicySection[],
  };
}

export function normalizePolicyPagesBundle(raw: unknown): PolicyPagesBundle {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    "how-to-buy": normalizePolicyPage(
      o["how-to-buy"] ?? o.howToBuy,
      "how-to-buy",
    ),
    returns: normalizePolicyPage(o.returns, "returns"),
    faq: normalizePolicyPage(o.faq, "faq"),
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function policyPageToFaqSchema(page: PolicyPageSettings) {
  return page.sections.flatMap((section) =>
    (section.items || [])
      .map((item) => {
        const question = item.title?.trim() || section.title;
        const answer = stripTags(item.contentHtml || "");
        if (!answer) return null;
        return { question, answer };
      })
      .filter(Boolean) as { question: string; answer: string }[],
  );
}
