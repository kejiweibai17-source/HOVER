import type { PolicySection } from "@/components/hover/PolicyAccordion";

export type PolicyPageKey = "how-to-buy" | "returns" | "faq" | "terms" | "privacy";

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
,
  "terms": {
    "pageTitle": "服務條款",
    "intro": "歡迎使用 HOVER 官方網站。\n當您瀏覽本網站、註冊會員或於本網站完成訂購，即表示您已閱讀、瞭解並同意遵守本服務條款、隱私權保護政策、申請退貨及其他相關購物規範。\nHOVER 將持續提供安心、清楚且順暢的購物體驗。若您對本服務條款或購物流程有任何疑問，歡迎透過官方客服與我們聯繫。",
    "contentColor": "#555555",
    "sections": [
      {
        "num": "01",
        "title": "網站服務說明",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 官方網站提供商品瀏覽、會員註冊、線上購物、訂單查詢、客服聯繫及相關品牌服務。</p><p>本網站所提供之商品資訊、價格、尺寸、顏色、材質、庫存狀態、活動內容與配送方式，將以各商品頁面、結帳頁面及本網站公告內容為準。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "02",
        "title": "會員註冊與帳號安全",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>使用者得依本網站流程註冊成為 HOVER 會員，並應提供正確、完整且即時更新的個人資料。</p><p>會員應妥善保管帳號與密碼，不得將帳號轉讓、出借或提供他人使用。若發現帳號遭盜用、異常登入或有其他安全疑慮，請立即通知 HOVER 官方客服協助處理。</p><p>若因會員未妥善保管帳號密碼或提供錯誤資料，導致訂單、配送、退款或會員權益受到影響，相關責任將由會員自行承擔。但 HOVER 於知悉帳號可能遭冒用時，將依合理方式協助暫停相關交易或服務處理。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "03",
        "title": "商品資訊與價格",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 將盡力確保網站上商品資訊、價格、庫存與活動內容正確無誤。</p><p>商品圖片可能因拍攝光線、螢幕顯示設定或瀏覽裝置不同，而與實際商品產生些微色差；商品尺寸如為人工平量，亦可能存在合理誤差，實際商品狀態請以收到實品為準。</p><p>若因系統異常、標價錯誤、庫存異常或其他不可歸責於消費者之情形，導致訂單內容需調整或無法成立，HOVER 將主動與您聯繫說明，並協助取消訂單或辦理退款。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "04",
        "title": "訂單成立與付款",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>當您於本網站完成訂購流程後，系統將寄送訂單確認通知至您所留存的 Email 或會員帳號資訊中。</p><p>訂單成立仍須以付款完成、資料確認及庫存狀態為準。若訂單資料不完整、付款失敗、商品缺貨、價格標示錯誤、系統異常或其他無法完成交易之情形，HOVER 保留取消或不接受該筆訂單之權利，並將主動通知消費者。</p><p>本網站可提供之付款方式，將以結帳頁面顯示為準，包含但不限於信用卡、ATM 虛擬帳號或其他 HOVER 日後開放之付款方式。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "05",
        "title": "配送方式與訂單出貨",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 將依您於結帳時選擇之配送方式安排出貨。實際配送方式、配送地區、運費、免運活動及出貨時間，將以本網站公告或結帳頁面顯示為準。</p><p>若因天災、物流異常、節慶檔期、系統維護、不可抗力或其他非 HOVER 可合理控制之因素，導致配送時間延遲，HOVER 將盡力協助追蹤並提供相關資訊。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "06",
        "title": "退貨與退款",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 目前提供退貨服務，暫不提供換貨。若需更換尺寸、顏色或款式，請重新下單選購。</p><p>退貨申請期限、退貨商品狀態、無法退貨情形、退款方式與處理時間，請詳閱本網站「申請退貨」頁面說明。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "07",
        "title": "優惠活動與折扣碼",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 可能不定期推出會員優惠、折扣碼、滿額活動、贈品活動或其他行銷活動。</p><p>各活動之適用條件、使用期限、折抵方式、排除商品與注意事項，將以活動頁面或結帳頁面公告為準。優惠活動不得要求折換現金、找零、轉讓或與其他優惠合併使用，除非活動頁面另有說明。</p><p>若訂單取消、退貨或未達活動條件，HOVER 得依活動規則調整優惠、贈品或退款金額。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "08",
        "title": "智慧財產權",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>本網站所使用之品牌名稱、商標、Logo、文字、圖片、影像、商品設計、網頁設計、版面配置及其他內容，均屬 HOVER 或合法授權人所有。</p><p>未經 HOVER 事前書面同意，任何人不得擅自重製、修改、轉載、下載、散布、公開展示、商業使用或以其他方式侵害相關智慧財產權。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "09",
        "title": "禁止行為",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>使用本網站時，您不得從事以下行為：</p><ul><li>使用不實資料註冊會員或下單。</li><li>冒用他人名義、帳號或付款資訊。</li><li>干擾網站系統、資安機制或正常交易流程。</li><li>大量下單後無故取消、未取貨、拒收或惡意退貨。</li><li>散布不實、誹謗、侵害他人權益或違反法令之內容。</li><li>未經授權使用 HOVER 之品牌、圖片、文字或網站內容。</li></ul><p>若發現帳號有異常交易、違反服務條款或影響其他消費者權益之情形，HOVER 得視情況暫停部分會員服務、取消異常訂單，或保留接受後續訂單之權利。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "10",
        "title": "服務暫停與系統維護",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 將盡力維持本網站正常運作。但因系統維護、設備更新、第三方服務異常、資安事件、天災或其他不可抗力因素，可能造成網站服務暫停、中斷或資料傳輸延遲。</p><p>若發生上述情形，HOVER 將盡力於合理範圍內恢復服務，並視情況公告或通知消費者。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "11",
        "title": "消費爭議處理",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>若您對商品、訂單、付款、配送、退貨或本網站服務有任何疑問，請先透過 HOVER 官方客服與我們聯繫，我們將盡力協助確認並處理。</p><p>客服信箱：service@hoverofficial.com</p><p>客服時間：MON.–FRI. 10:00–19:00</p><p>官方 LINE：@HOVER</p><p>若因本服務條款或網路交易產生爭議，雙方應本於誠信原則協商解決。若仍有訴訟必要，依相關法律規定處理。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "12",
        "title": "條款修改",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 保留依營運需求、服務調整或法令變更修改本服務條款之權利。</p><p>修改後之內容將公告於本網站，並自公告日起生效。建議您定期查閱本服務條款，以保障自身權益。</p>",
            "titleColor": "#0f172a"
          }
        ]
      }
    ]
  },
  "privacy": {
    "pageTitle": "隱私權保護",
    "intro": "HOVER 重視每一位會員與顧客的個人資料與隱私權。\n為提供您安心、順暢的購物體驗，我們將依據個人資料保護相關法令，妥善蒐集、處理及利用您的個人資料，並採取合理安全措施保護您的資料。\n當您使用 HOVER 官方網站、註冊會員、訂購商品、聯繫客服或參與品牌活動時，即表示您已閱讀並瞭解本隱私權保護政策。",
    "contentColor": "#555555",
    "sections": [
      {
        "num": "01",
        "title": "適用範圍",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>本隱私權保護政策適用於 HOVER 官方網站所提供之會員註冊、商品訂購、付款、配送、客服、行銷活動及其他相關服務。</p><p>本政策不適用於非 HOVER 所有或控制之第三方網站、外部連結、社群平台或第三方服務。當您點選外部連結或使用第三方服務時，請另行參閱該第三方之隱私權政策。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "02",
        "title": "個人資料之蒐集目的",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 蒐集、處理及利用您的個人資料，主要基於以下目的：</p><ul><li>會員註冊、身分確認與會員管理。</li><li>商品訂購、付款確認、配送與退貨退款處理。</li><li>電子發票開立、交易紀錄保存與帳務管理。</li><li>客服聯繫、售後服務、爭議處理與權益通知。</li><li>行銷活動、優惠通知、會員服務與品牌資訊提供。</li><li>網站功能優化、流量分析、系統安全與服務改善。</li><li>依法令規定、主管機關要求或其他合法必要用途。</li></ul>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "03",
        "title": "蒐集之個人資料類別",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>依您使用服務的情況，HOVER 可能蒐集以下資料：</p><ul><li>會員與聯絡資料：姓名、電話、Email、生日、會員帳號、LINE ID 或其他聯絡資訊。</li><li>訂單與配送資料：收件人姓名、收件電話、配送地址、訂單內容、購買紀錄、付款方式、發票資訊、退貨退款資料。</li><li>客服與互動紀錄：客服對話內容、退貨申請資料、商品問題照片或影片、問卷回覆、活動參與紀錄。</li><li>網站與裝置資訊：IP 位址、瀏覽器類型、裝置資訊、瀏覽紀錄、Cookie、網站使用行為及系統紀錄。</li></ul><p>HOVER 不會主動要求您提供與購物服務無關之敏感個人資料。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "04",
        "title": "個人資料之利用期間、地區、對象及方式",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "利用期間",
            "collapsible": true,
            "contentHtml": "<p>HOVER 將於會員關係存續期間、交易或服務處理期間、法令規定保存期間，或為完成蒐集目的所必要之期間內利用您的個人資料。</p>",
            "titleColor": "#0f172a"
          },
          {
            "title": "利用地區",
            "collapsible": true,
            "contentHtml": "<p>您的個人資料將主要於台灣地區使用。若因系統、雲端服務、金流、物流或其他合作服務涉及跨境資料處理，HOVER 將於必要範圍內妥善處理。</p>",
            "titleColor": "#0f172a"
          },
          {
            "title": "利用對象",
            "collapsible": true,
            "contentHtml": "<p>HOVER、受 HOVER 委託或合作之網站系統商、金流服務商、物流業者、電子發票服務商、客服系統、簡訊或 Email 通知服務商、行銷服務合作單位，以及依法有權調閱資料之主管機關或司法機關。</p>",
            "titleColor": "#0f172a"
          },
          {
            "title": "利用方式",
            "collapsible": true,
            "contentHtml": "<p>包含但不限於會員管理、訂單處理、付款確認、商品配送、退貨退款、客服聯繫、電子發票開立、活動通知、系統維護、資料分析及法令要求之必要處理。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "05",
        "title": "第三方服務與資料提供",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>為完成您的訂單、付款、配送、發票、客服與網站服務，HOVER 可能於必要範圍內，將您的個人資料提供予合作之第三方服務商。例如金流服務商、物流配送業者、電子發票平台、網站系統服務商、Email 或簡訊通知服務商等。</p><p>HOVER 不會任意出售、交換或出租您的個人資料予第三方。除非取得您的同意、為完成交易服務所必要，或依法令規定及主管機關要求，否則不會將您的個人資料用於與原蒐集目的無關之用途。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "06",
        "title": "Cookie 使用說明",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>為提供更好的網站體驗，HOVER 官方網站可能使用 Cookie 或類似技術，以記錄您的瀏覽偏好、會員登入狀態、購物車內容及網站使用情形，作為網站功能維持與服務優化之用途。</p><p>您可透過瀏覽器設定拒絕或刪除 Cookie。惟若停用 Cookie，部分功能可能無法正常使用，例如會員登入、購物車保存或結帳流程。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "07",
        "title": "個人資料安全維護",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 將採取合理且必要之安全措施，保護您的個人資料免於遺失、遭竊、未經授權存取、竄改、洩漏或不當使用。</p><p>惟網路資料傳輸無法保證百分之百安全，請您妥善保管會員帳號、密碼及個人裝置，並避免於公共電腦或不安全網路環境中登入會員帳號或進行付款操作。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "08",
        "title": "當事人權利",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>依個人資料保護法規定，您得就 HOVER 所保有之個人資料，向我們行使以下權利：</p><ul><li>查詢或請求閱覽。</li><li>請求製給複製本。</li><li>請求補充或更正。</li><li>請求停止蒐集、處理或利用。</li><li>請求刪除。</li></ul><p>若您欲行使上述權利，可透過 HOVER 官方客服與我們聯繫。HOVER 將依相關法令及內部作業程序協助處理。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "09",
        "title": "不提供資料之影響",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>您可自由選擇是否提供個人資料。惟若您拒絕提供完成會員註冊、訂單成立、付款確認、商品配送、退貨退款、客服處理或電子發票開立所必要之資料，HOVER 可能無法提供相關服務或完成交易流程。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "10",
        "title": "未成年人保護",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>若您為未成年人，請於法定代理人閱讀、瞭解並同意本隱私權保護政策後，再使用本網站服務或進行購物。</p><p>若您已使用本網站服務或完成訂購，HOVER 將視為您已取得法定代理人之同意。</p>",
            "titleColor": "#0f172a"
          }
        ]
      },
      {
        "num": "11",
        "title": "政策修改",
        "titleColor": "#2a514d",
        "items": [
          {
            "title": "",
            "collapsible": false,
            "contentHtml": "<p>HOVER 保留依服務內容、營運需求或法令變更修改本隱私權保護政策之權利。</p><p>修改後之內容將公告於本網站，並自公告日起生效。建議您定期查閱本政策，以了解 HOVER 如何保護您的個人資料與隱私權。</p>",
            "titleColor": "#0f172a"
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
    terms: normalizePolicyPage(o.terms, "terms"),
    privacy: normalizePolicyPage(o.privacy, "privacy"),
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
