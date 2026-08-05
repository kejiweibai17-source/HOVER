<?php
/**
 * HOVER — 說明頁內容管理（如何購買 / 申請退貨 / 常見問題 / 服務條款 / 隱私權保護）
 *
 * 使用方式：
 * 1. Code Snippets → Add New → 貼上本檔 → Run Everywhere
 * 2. 左側選單「HOVER 說明頁」
 *
 * 結構：
 * - Tab：如何購買 / 申請退貨 / 常見問題 / 服務條款 / 隱私權保護
 * - 大標題項目（01/02/03…）：強制收折、可選顏色、可新增
 * - 內層項目：可選是否收折、可選標題顏色、內容編輯器（文字色／連結）
 *
 * REST：
 * GET /wp-json/hover/v1/policy-pages
 * GET /wp-json/hover/v1/policy-pages/{how-to-buy|returns|faq|terms|privacy}
 */

if (!defined('ABSPATH')) { exit; }
if (defined('HPOL_LOADED')) { return; }
define('HPOL_LOADED', true);

const HPOL_OPTION = 'hover_policy_pages_v1';
const HPOL_PAGE_KEYS = ['how-to-buy', 'returns', 'faq', 'terms', 'privacy'];

function hpol_defaults_raw(): array {
    static $cached = null;
    if ($cached !== null) return $cached;
    $json = <<<'HPOL_DEFAULTS_JSON'
{"how-to-buy":{"pageTitle":"如何購買","intro":"","contentColor":"#2a514d","sections":[{"num":"01","title":"購物流程","introHtml":"","items":[{"title":"登入會員","collapsible":true,"contentHtml":"<p>點選會員圖示，登入或註冊 HOVER 會員帳號。</p>"},{"title":"選擇商品","collapsible":true,"contentHtml":"<p>選擇您喜歡的商品，確認顏色、尺寸與數量後，加入購物袋。</p>"},{"title":"確認訂單","collapsible":true,"contentHtml":"<p>點選右上角購物袋，確認訂單內容、配送方式與付款方式。</p>"},{"title":"完成結帳","collapsible":true,"contentHtml":"<p>完成結帳後，您可至會員中心查看訂單紀錄與配送狀態。</p>"},{"title":"貼心提醒","collapsible":true,"contentHtml":"<ul><li>商品加入購物袋後，系統尚不會保留庫存；實際庫存將以完成結帳之順序為準。</li><li>若訂單內同時包含現貨與預購商品，建議您分開結帳。現貨商品將依正常出貨時間安排寄出；預購商品則依商品頁標示之預計到貨時間陸續出貨。</li><li>預購商品之到貨時間可能受製作排程、物流配送、海關檢驗或其他不可抗力因素影響。若商品提前到貨，HOVER 將盡快為您安排出貨。</li></ul>"}]},{"num":"02","title":"付款方式","introHtml":"<p>HOVER 目前提供以下付款方式：</p>","items":[{"title":"信用卡線上付款","collapsible":true,"contentHtml":"<p>HOVER 使用綠界科技金流服務，支援 VISA、MasterCard、JCB 等信用卡付款方式。</p><p>實際可使用之卡別，將依結帳頁面顯示為準。</p>"},{"title":"ATM 虛擬帳號轉帳","collapsible":true,"contentHtml":"<p>選擇 ATM 虛擬帳號付款後，系統將自動產生一組專屬付款資訊，包含銀行代碼、虛擬帳號、付款金額與繳費期限。</p><p>請於期限內透過網路銀行、手機銀行或 ATM 機台完成付款。付款完成後，系統將自動更新訂單狀態，無需另外回報匯款後五碼。</p><p>若逾期未付款，訂單將自動取消，請重新下單。</p>"}]},{"num":"03","title":"配送方式","introHtml":"","items":[{"title":"超商取貨｜不付款","collapsible":true,"contentHtml":"<p>HOVER 目前提供超商取貨服務。當商品送達您指定的超商門市後，系統將發送取貨通知，請您於簡訊或物流系統指定期限內完成取貨。</p><p>實際可選擇之超商門市與配送方式，將依結帳頁面顯示為準。</p>"},{"title":"運費說明","collapsible":true,"contentHtml":"<p>超商取貨運費為 NT$80。</p><p>若有免運優惠或期間限定活動，將依官網公告與結帳頁面顯示內容為準。</p>"}]},{"num":"04","title":"出貨與配送時間","introHtml":"","items":[{"title":"現貨商品","collapsible":true,"contentHtml":"<p>現貨商品於付款完成後，約 1–3 個工作日安排出貨，不含例假日與國定假日。</p>"},{"title":"配送時間","collapsible":true,"contentHtml":"<p>包裹出貨後，約 2–4 個工作日送達指定超商門市。實際配送時間可能因物流量、門市作業、天候或其他不可抗力因素而有所調整。</p>"},{"title":"特殊情況","collapsible":true,"contentHtml":"<p>若遇訂單量較多、連續假期或特殊活動期間，出貨時間可能略有延遲。實際出貨狀態請以您收到的出貨通知為準。</p>"}]},{"num":"05","title":"訂單注意事項","introHtml":"","items":[{"title":"物流異常","collapsible":true,"contentHtml":"<p>若包裹發生異常配送、門市關轉、逾期未取或其他物流問題，HOVER 客服將視情況與您聯繫協助處理。</p>"},{"title":"未取與異常交易","collapsible":true,"contentHtml":"<p>若帳號多次發生無故未取、拒收或異常交易情形，HOVER 將視情況暫停該帳號部分交易服務，以維護雙方交易權益。</p>"},{"title":"訂單諮詢","collapsible":true,"contentHtml":"<p>如您對訂單、付款或配送狀態有任何疑問，歡迎透過官方客服與我們聯繫。</p>"}]},{"num":"06","title":"防詐騙提醒","introHtml":"","items":[{"title":"","collapsible":false,"contentHtml":"<p>HOVER 不會主動來電要求您操作 ATM、提供銀行帳戶、信用卡資料或購買點數。</p><p>若您接獲可疑電話、簡訊或不明連結，請勿依照指示操作，並請立即與 HOVER 官方客服確認，或撥打 165 反詐騙諮詢專線。</p>"}]}]},"returns":{"pageTitle":"申請退貨","intro":"HOVER 希望每一次購買都能讓您安心。若您收到商品後有退貨需求，請依照以下說明提出申請，我們將協助您完成退貨流程。","contentColor":"#2a514d","sections":[{"num":"01","title":"退貨通知","introHtml":"","items":[{"title":"退貨服務","collapsible":true,"contentHtml":"<p>HOVER 目前提供退貨服務，暫不提供換貨。</p><p>如需更換尺寸、顏色或款式，請重新下單選購。</p>"},{"title":"申請期限","collapsible":true,"contentHtml":"<p>如欲辦理退貨，請於收到商品次日起 7 日內，透過 HOVER 官方客服提出退貨申請。</p><p>逾期提出申請者，恕無法受理退貨。</p>"},{"title":"申請方式","collapsible":true,"contentHtml":"<p>退貨申請須先聯繫 HOVER 官方客服確認。</p><p>未經客服確認而自行寄回之商品，將無法完成退貨流程；如需重新寄回，相關費用將由消費者自行負擔。</p>"},{"title":"退貨運費","collapsible":true,"contentHtml":"<p>於 7 日鑑賞期內申請退貨，HOVER 將依相關法規協助辦理退貨流程。同筆訂單申請二次以上退貨服務，運費80元請自行負擔。</p><p>若因退貨資料不完整、退貨代碼逾期失效、未依客服指示寄回，或同筆訂單重複申請造成額外物流、行政或處理成本，HOVER 將由客服個案說明後續處理方式。</p>"}]},{"num":"02","title":"退貨申請流程","introHtml":"","items":[{"title":"聯繫客服","collapsible":true,"contentHtml":"<p>請登入 HOVER 會員中心，進入訂單查詢後，點選聯繫客服提出退貨申請。</p>"},{"title":"確認退貨資訊","collapsible":true,"contentHtml":"<p>客服將協助確認訂單資料、退貨商品與退貨原因，並提供後續退貨方式。</p>"},{"title":"取得退貨代碼","collapsible":true,"contentHtml":"<p>退貨申請成立後，客服將提供退貨代碼與操作說明。</p>"},{"title":"超商寄回","collapsible":true,"contentHtml":"<p>請依客服提供之退貨方式，至指定超商機台列印退貨單，並將包裹交由櫃台人員寄回。</p>"},{"title":"保留收據","collapsible":true,"contentHtml":"<p>完成寄件後，請妥善保留寄件收據，直到退貨與退款流程完成。</p>"}]},{"num":"03","title":"超商退貨說明","introHtml":"","items":[{"title":"超商退貨","collapsible":true,"contentHtml":"<p>退貨申請成立後，客服將提供退貨代碼與操作說明。請依客服提供之退貨方式至指定超商辦理退貨。</p>"},{"title":"操作說明","collapsible":true,"contentHtml":"<p>可依實際退貨方式，參考以下超商退貨操作說明：</p><p><a href=\"https://www.7-11.com.tw/service/return.aspx\" target=\"_blank\" rel=\"noopener noreferrer\">7-ELEVEN 退貨操作說明</a></p><p><a href=\"https://www.famiport.com.tw/Web_Famiport/page/fp_operating.aspx?MN=5&amp;CN=1078\" target=\"_blank\" rel=\"noopener noreferrer\">全家退貨操作說明</a></p>"},{"title":"包裹尺寸限制","collapsible":true,"contentHtml":"<p>超商退貨包裹須符合物流材積與重量限制。實際限制將依各超商與物流系統規範為準；若包裹尺寸超出限制，客服將協助提供其他退貨方式。</p>"}]},{"num":"04","title":"退貨商品狀態","introHtml":"","items":[{"title":"商品完整性","collapsible":true,"contentHtml":"<p>退貨商品須保持全新、未使用、未下水、無異味、無髒污，並保留完整包裝、吊牌、配件、贈品與出貨相關文件。</p>"},{"title":"包裝完整性","collapsible":true,"contentHtml":"<p>請將商品以原包裝或適當包材妥善包裝後寄回。若無原外箱，可使用不透明包裝袋或紙箱寄回，並請避免商品於運送過程中受損。</p>"},{"title":"瑕疵或寄錯商品","collapsible":true,"contentHtml":"<p>若您收到的商品有缺件、寄錯或明顯瑕疵，請保留商品、包裝與相關照片或影片，並儘速聯繫客服協助確認。</p>"}]},{"num":"05","title":"無法退貨情形","introHtml":"","items":[{"title":"","collapsible":false,"contentHtml":"<p>以下情況恕無法辦理退貨：</p><p>若商品本身有瑕疵或寄錯錯誤，請於收到商品後儘速聯繫客服協助處理。</p><ul><li>超過 7 日鑑賞期。</li><li>未先聯繫客服申請，或退貨代碼逾期失效。</li><li>商品已使用、下水、清洗、修改或有穿著痕跡。</li><li>商品沾有粉底、口紅、香水、菸味、衣物芳香劑或其他明顯異味。</li><li>商品有刮傷、破損、髒污，或因人為因素造成非原始狀態。</li><li>商品包裝不完整，包含吊牌已剪、配件遺失、贈品未歸還、原包裝遺失或損壞。</li><li>基於個人衛生考量，襪子、貼身衣物等個人衛生用品，如已拆封、試穿、使用或包裝不完整，恕無法辦理退貨。</li><li>其他依商品性質、法令規定或客服確認後不符合退貨條件之情形。</li></ul>"}]},{"num":"06","title":"退款方式與時間","introHtml":"","items":[{"title":"信用卡付款","collapsible":true,"contentHtml":"<p>若原訂單使用信用卡付款，退款將以刷退方式退回原付款信用卡。實際入帳時間將依各發卡銀行作業時間而有所不同。</p>"},{"title":"ATM 虛擬帳號付款","collapsible":true,"contentHtml":"<p>若原訂單使用 ATM 虛擬帳號付款，客服將協助確認退款帳戶資訊。待退貨商品確認無誤後，將依流程安排退款。</p>"},{"title":"退款時間","collapsible":true,"contentHtml":"<p>HOVER 收到退貨商品並確認商品狀態無誤後，約 7-14 個工作日內完成退款作業。實際入帳時間仍依銀行、信用卡公司或金流作業時間為準。</p>"}]},{"num":"07","title":"貼心提醒","introHtml":"","items":[{"title":"開箱紀錄","collapsible":true,"contentHtml":"<p>為保障雙方權益，建議您於開箱時全程錄影。若商品有缺件、寄錯或明顯瑕疵，照片與影片將有助於客服加速確認。</p>"},{"title":"尺寸與色差","collapsible":true,"contentHtml":"<p>商品尺寸皆為人工平量，與實際商品可能有約 ±2cm 誤差，屬正常範圍。不同螢幕、手機與拍攝光線可能造成些微色差，實際顏色請以收到商品為準。</p>"},{"title":"非瑕疵範圍","collapsible":true,"contentHtml":"<p>線頭、輕微脫線、衣物壓痕、些微混線、輕微溢膠或殘膠，皆可能因製程、運送或包裝產生。若不影響商品穿著與使用，原則上不屬於瑕疵範圍。</p>"},{"title":"商品氣味","collapsible":true,"contentHtml":"<p>布料、印刷或染劑可能因包裝密封產生些微氣味。建議收到後置於通風處，氣味通常會逐漸淡化。</p>"},{"title":"異常交易處理","collapsible":true,"contentHtml":"<p>若帳號多次發生異常退貨、頻繁取消訂單、無故未取、拒收、退貨資料不完整或違反交易規則之情形，HOVER 將視情況暫停該帳號部分交易服務，或保留接受後續訂單之權利。</p>"}]}]},"faq":{"pageTitle":"常見問題","intro":"","contentColor":"#2a514d","sections":[{"num":"01","title":"客服與訂單","introHtml":"","items":[{"title":"如何聯繫客服？","collapsible":true,"contentHtml":"<p>您可透過 HOVER 官方客服信箱或官方 LINE 與我們聯繫。客服時間為週一至週五 10:00–19:00，例假日與國定假日暫停服務。客服將依訊息順序回覆，感謝您的耐心等候。</p>"},{"title":"訂單可以合併嗎？","collapsible":true,"contentHtml":"<p>為確保訂單、付款與出貨資料正確，HOVER 目前不提供併單服務。若您有多筆訂單，將依各筆訂單成立順序分別安排出貨。</p>"},{"title":"下單完成後，可以修改訂單內容嗎？","collapsible":true,"contentHtml":"<p>訂單成立後，系統將依訂單內容進行後續處理，恕無法直接修改商品、尺寸、顏色、數量或配送方式。如需調整訂單，請儘速聯繫 HOVER 官方客服，我們將依訂單狀態協助確認是否可取消後重新下單。</p>"}]},{"num":"02","title":"商品與出貨","introHtml":"","items":[{"title":"請問商品有現貨嗎？","collapsible":true,"contentHtml":"<p>HOVER 目前販售商品以現貨為主。現貨商品於付款完成後，約 1–3 個工作日安排出貨，不含例假日與國定假日。實際庫存仍以完成結帳當下之系統顯示為準。</p>"},{"title":"請問預購商品要等多久？","collapsible":true,"contentHtml":"<p>若商品為預購商品，HOVER 將於商品頁標示預計出貨時間。預購商品之到貨時間可能因製作排程、物流配送、海關檢驗或其他不可抗力因素而有所調整；若商品提前到貨，HOVER 將盡快安排出貨。</p>"},{"title":"現貨與預購商品可以一起下單嗎？","collapsible":true,"contentHtml":"<p>若訂單內同時包含現貨與預購商品，建議您分開結帳。若一併下單，訂單將待預購商品全數到貨後再一併安排出貨。</p>"}]},{"num":"03","title":"付款與發票","introHtml":"","items":[{"title":"下單完成後，可以更改付款方式嗎？","collapsible":true,"contentHtml":"<p>訂單成立後，系統無法直接變更付款方式。如需更換付款方式，請重新下單，並聯繫 HOVER 官方客服協助取消原訂單。</p>"},{"title":"HOVER 會開立發票嗎？","collapsible":true,"contentHtml":"<p>HOVER 採用電子發票服務。訂單付款完成後，系統將依您結帳時填寫的發票資訊開立電子發票，並寄送發票開立通知至您的 Email 信箱。</p>"},{"title":"可以開立公司戶發票嗎？","collapsible":true,"contentHtml":"<p>可以。若需開立公司戶發票，請於結帳時填寫統一編號與公司抬頭。發票一經開立，恕無法任意更改發票類型、統一編號或抬頭資訊，請於送出訂單前再次確認。</p>"},{"title":"包裹內會附紙本發票嗎？","collapsible":true,"contentHtml":"<p>HOVER 採用電子發票，包裹內不另附紙本發票。如需發票證明，請聯繫 HOVER 官方客服協助處理。</p>"}]},{"num":"04","title":"退貨相關","introHtml":"","items":[{"title":"HOVER 可以換貨嗎？","collapsible":true,"contentHtml":"<p>HOVER 目前提供退貨服務，暫不提供換貨。如需更換尺寸、顏色或款式，請重新下單選購。</p>"},{"title":"收到商品後可以退貨嗎？","collapsible":true,"contentHtml":"<p>如欲辦理退貨，請於收到商品次日起 7 日內，透過 HOVER 官方客服提出退貨申請。退貨商品須保持全新、未使用、未下水、無異味、無髒污，並保留完整包裝、吊牌、配件與贈品。</p>"},{"title":"如果收到瑕疵品或寄錯商品怎麼辦？","collapsible":true,"contentHtml":"<p>若您收到的商品有缺件、寄錯或明顯瑕疵，請保留商品、包裝與相關照片或影片，並儘速聯繫 HOVER 官方客服協助確認。</p>"},{"title":"襪子可以退貨嗎？","collapsible":true,"contentHtml":"<p>基於個人衛生考量，襪子、貼身衣物等個人衛生用品，如已拆封、試穿、使用或包裝不完整，恕無法辦理退貨。若商品本身有瑕疵或寄送錯誤，請於收到商品後儘速聯繫客服協助處理。</p>"}]},{"num":"05","title":"商品保養","introHtml":"","items":[{"title":"衣物如何清洗與保養？","collapsible":true,"contentHtml":"<p>建議依照商品洗滌標示清洗。一般衣物建議翻面清洗、使用中性洗劑，並放入洗衣袋以降低摩擦與變形。</p>"},{"title":"可以烘乾或長時間曝曬嗎？","collapsible":true,"contentHtml":"<p>不建議使用烘乾機或長時間陽光直曬，以免造成衣物縮水、變形或褪色。洗滌後建議陰涼通風自然晾乾。</p>"},{"title":"深色衣物需要注意什麼？","collapsible":true,"contentHtml":"<p>深色衣物建議與淺色衣物分開洗滌，並避免與淺色包款或配件長時間摩擦，以降低移染可能。</p>"},{"title":"商品尺寸會有誤差嗎？","collapsible":true,"contentHtml":"<p>商品尺寸皆為人工平量，與實際商品可能有約 ±2cm 誤差，屬正常範圍。</p>"}]}]}}
HPOL_DEFAULTS_JSON;
    $decoded = json_decode($json, true);
    $cached = is_array($decoded) ? $decoded : [];

    $legal_json = <<<'HPOL_LEGAL_DEFAULTS_JSON'
{"terms":{"pageTitle":"服務條款","intro":"歡迎使用 HOVER 官方網站。\n當您瀏覽本網站、註冊會員或於本網站完成訂購，即表示您已閱讀、瞭解並同意遵守本服務條款、隱私權保護政策、申請退貨及其他相關購物規範。\nHOVER 將持續提供安心、清楚且順暢的購物體驗。若您對本服務條款或購物流程有任何疑問，歡迎透過官方客服與我們聯繫。","contentColor":"#555555","sections":[{"num":"01","title":"網站服務說明","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>HOVER 官方網站提供商品瀏覽、會員註冊、線上購物、訂單查詢、客服聯繫及相關品牌服務。</p><p>本網站所提供之商品資訊、價格、尺寸、顏色、材質、庫存狀態、活動內容與配送方式，將以各商品頁面、結帳頁面及本網站公告內容為準。</p>","titleColor":"#0f172a"}]},{"num":"02","title":"會員註冊與帳號安全","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>使用者得依本網站流程註冊成為 HOVER 會員，並應提供正確、完整且即時更新的個人資料。</p><p>會員應妥善保管帳號與密碼，不得將帳號轉讓、出借或提供他人使用。若發現帳號遭盜用、異常登入或有其他安全疑慮，請立即通知 HOVER 官方客服協助處理。</p><p>若因會員未妥善保管帳號密碼或提供錯誤資料，導致訂單、配送、退款或會員權益受到影響，相關責任將由會員自行承擔。但 HOVER 於知悉帳號可能遭冒用時，將依合理方式協助暫停相關交易或服務處理。</p>","titleColor":"#0f172a"}]},{"num":"03","title":"商品資訊與價格","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>HOVER 將盡力確保網站上商品資訊、價格、庫存與活動內容正確無誤。</p><p>商品圖片可能因拍攝光線、螢幕顯示設定或瀏覽裝置不同，而與實際商品產生些微色差；商品尺寸如為人工平量，亦可能存在合理誤差，實際商品狀態請以收到實品為準。</p><p>若因系統異常、標價錯誤、庫存異常或其他不可歸責於消費者之情形，導致訂單內容需調整或無法成立，HOVER 將主動與您聯繫說明，並協助取消訂單或辦理退款。</p>","titleColor":"#0f172a"}]},{"num":"04","title":"訂單成立與付款","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>當您於本網站完成訂購流程後，系統將寄送訂單確認通知至您所留存的 Email 或會員帳號資訊中。</p><p>訂單成立仍須以付款完成、資料確認及庫存狀態為準。若訂單資料不完整、付款失敗、商品缺貨、價格標示錯誤、系統異常或其他無法完成交易之情形，HOVER 保留取消或不接受該筆訂單之權利，並將主動通知消費者。</p><p>本網站可提供之付款方式，將以結帳頁面顯示為準，包含但不限於信用卡、ATM 虛擬帳號或其他 HOVER 日後開放之付款方式。</p>","titleColor":"#0f172a"}]},{"num":"05","title":"配送方式與訂單出貨","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>HOVER 將依您於結帳時選擇之配送方式安排出貨。實際配送方式、配送地區、運費、免運活動及出貨時間，將以本網站公告或結帳頁面顯示為準。</p><p>若因天災、物流異常、節慶檔期、系統維護、不可抗力或其他非 HOVER 可合理控制之因素，導致配送時間延遲，HOVER 將盡力協助追蹤並提供相關資訊。</p>","titleColor":"#0f172a"}]},{"num":"06","title":"退貨與退款","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>HOVER 目前提供退貨服務，暫不提供換貨。若需更換尺寸、顏色或款式，請重新下單選購。</p><p>退貨申請期限、退貨商品狀態、無法退貨情形、退款方式與處理時間，請詳閱本網站「申請退貨」頁面說明。</p>","titleColor":"#0f172a"}]},{"num":"07","title":"優惠活動與折扣碼","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>HOVER 可能不定期推出會員優惠、折扣碼、滿額活動、贈品活動或其他行銷活動。</p><p>各活動之適用條件、使用期限、折抵方式、排除商品與注意事項，將以活動頁面或結帳頁面公告為準。優惠活動不得要求折換現金、找零、轉讓或與其他優惠合併使用，除非活動頁面另有說明。</p><p>若訂單取消、退貨或未達活動條件，HOVER 得依活動規則調整優惠、贈品或退款金額。</p>","titleColor":"#0f172a"}]},{"num":"08","title":"智慧財產權","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>本網站所使用之品牌名稱、商標、Logo、文字、圖片、影像、商品設計、網頁設計、版面配置及其他內容，均屬 HOVER 或合法授權人所有。</p><p>未經 HOVER 事前書面同意，任何人不得擅自重製、修改、轉載、下載、散布、公開展示、商業使用或以其他方式侵害相關智慧財產權。</p>","titleColor":"#0f172a"}]},{"num":"09","title":"禁止行為","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>使用本網站時，您不得從事以下行為：</p><ul><li>使用不實資料註冊會員或下單。</li><li>冒用他人名義、帳號或付款資訊。</li><li>干擾網站系統、資安機制或正常交易流程。</li><li>大量下單後無故取消、未取貨、拒收或惡意退貨。</li><li>散布不實、誹謗、侵害他人權益或違反法令之內容。</li><li>未經授權使用 HOVER 之品牌、圖片、文字或網站內容。</li></ul><p>若發現帳號有異常交易、違反服務條款或影響其他消費者權益之情形，HOVER 得視情況暫停部分會員服務、取消異常訂單，或保留接受後續訂單之權利。</p>","titleColor":"#0f172a"}]},{"num":"10","title":"服務暫停與系統維護","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>HOVER 將盡力維持本網站正常運作。但因系統維護、設備更新、第三方服務異常、資安事件、天災或其他不可抗力因素，可能造成網站服務暫停、中斷或資料傳輸延遲。</p><p>若發生上述情形，HOVER 將盡力於合理範圍內恢復服務，並視情況公告或通知消費者。</p>","titleColor":"#0f172a"}]},{"num":"11","title":"消費爭議處理","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>若您對商品、訂單、付款、配送、退貨或本網站服務有任何疑問，請先透過 HOVER 官方客服與我們聯繫，我們將盡力協助確認並處理。</p><p>客服信箱：service@hoverofficial.com</p><p>客服時間：MON.–FRI. 10:00–19:00</p><p>官方 LINE：@HOVER</p><p>若因本服務條款或網路交易產生爭議，雙方應本於誠信原則協商解決。若仍有訴訟必要，依相關法律規定處理。</p>","titleColor":"#0f172a"}]},{"num":"12","title":"條款修改","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>HOVER 保留依營運需求、服務調整或法令變更修改本服務條款之權利。</p><p>修改後之內容將公告於本網站，並自公告日起生效。建議您定期查閱本服務條款，以保障自身權益。</p>","titleColor":"#0f172a"}]}]},"privacy":{"pageTitle":"隱私權保護","intro":"HOVER 重視每一位會員與顧客的個人資料與隱私權。\n為提供您安心、順暢的購物體驗，我們將依據個人資料保護相關法令，妥善蒐集、處理及利用您的個人資料，並採取合理安全措施保護您的資料。\n當您使用 HOVER 官方網站、註冊會員、訂購商品、聯繫客服或參與品牌活動時，即表示您已閱讀並瞭解本隱私權保護政策。","contentColor":"#555555","sections":[{"num":"01","title":"適用範圍","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>本隱私權保護政策適用於 HOVER 官方網站所提供之會員註冊、商品訂購、付款、配送、客服、行銷活動及其他相關服務。</p><p>本政策不適用於非 HOVER 所有或控制之第三方網站、外部連結、社群平台或第三方服務。當您點選外部連結或使用第三方服務時，請另行參閱該第三方之隱私權政策。</p>","titleColor":"#0f172a"}]},{"num":"02","title":"個人資料之蒐集目的","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>HOVER 蒐集、處理及利用您的個人資料，主要基於以下目的：</p><ul><li>會員註冊、身分確認與會員管理。</li><li>商品訂購、付款確認、配送與退貨退款處理。</li><li>電子發票開立、交易紀錄保存與帳務管理。</li><li>客服聯繫、售後服務、爭議處理與權益通知。</li><li>行銷活動、優惠通知、會員服務與品牌資訊提供。</li><li>網站功能優化、流量分析、系統安全與服務改善。</li><li>依法令規定、主管機關要求或其他合法必要用途。</li></ul>","titleColor":"#0f172a"}]},{"num":"03","title":"蒐集之個人資料類別","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>依您使用服務的情況，HOVER 可能蒐集以下資料：</p><ul><li>會員與聯絡資料：姓名、電話、Email、生日、會員帳號、LINE ID 或其他聯絡資訊。</li><li>訂單與配送資料：收件人姓名、收件電話、配送地址、訂單內容、購買紀錄、付款方式、發票資訊、退貨退款資料。</li><li>客服與互動紀錄：客服對話內容、退貨申請資料、商品問題照片或影片、問卷回覆、活動參與紀錄。</li><li>網站與裝置資訊：IP 位址、瀏覽器類型、裝置資訊、瀏覽紀錄、Cookie、網站使用行為及系統紀錄。</li></ul><p>HOVER 不會主動要求您提供與購物服務無關之敏感個人資料。</p>","titleColor":"#0f172a"}]},{"num":"04","title":"個人資料之利用期間、地區、對象及方式","titleColor":"#2a514d","items":[{"title":"利用期間","collapsible":true,"contentHtml":"<p>HOVER 將於會員關係存續期間、交易或服務處理期間、法令規定保存期間，或為完成蒐集目的所必要之期間內利用您的個人資料。</p>","titleColor":"#0f172a"},{"title":"利用地區","collapsible":true,"contentHtml":"<p>您的個人資料將主要於台灣地區使用。若因系統、雲端服務、金流、物流或其他合作服務涉及跨境資料處理，HOVER 將於必要範圍內妥善處理。</p>","titleColor":"#0f172a"},{"title":"利用對象","collapsible":true,"contentHtml":"<p>HOVER、受 HOVER 委託或合作之網站系統商、金流服務商、物流業者、電子發票服務商、客服系統、簡訊或 Email 通知服務商、行銷服務合作單位，以及依法有權調閱資料之主管機關或司法機關。</p>","titleColor":"#0f172a"},{"title":"利用方式","collapsible":true,"contentHtml":"<p>包含但不限於會員管理、訂單處理、付款確認、商品配送、退貨退款、客服聯繫、電子發票開立、活動通知、系統維護、資料分析及法令要求之必要處理。</p>","titleColor":"#0f172a"}]},{"num":"05","title":"第三方服務與資料提供","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>為完成您的訂單、付款、配送、發票、客服與網站服務，HOVER 可能於必要範圍內，將您的個人資料提供予合作之第三方服務商。例如金流服務商、物流配送業者、電子發票平台、網站系統服務商、Email 或簡訊通知服務商等。</p><p>HOVER 不會任意出售、交換或出租您的個人資料予第三方。除非取得您的同意、為完成交易服務所必要，或依法令規定及主管機關要求，否則不會將您的個人資料用於與原蒐集目的無關之用途。</p>","titleColor":"#0f172a"}]},{"num":"06","title":"Cookie 使用說明","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>為提供更好的網站體驗，HOVER 官方網站可能使用 Cookie 或類似技術，以記錄您的瀏覽偏好、會員登入狀態、購物車內容及網站使用情形，作為網站功能維持與服務優化之用途。</p><p>您可透過瀏覽器設定拒絕或刪除 Cookie。惟若停用 Cookie，部分功能可能無法正常使用，例如會員登入、購物車保存或結帳流程。</p>","titleColor":"#0f172a"}]},{"num":"07","title":"個人資料安全維護","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>HOVER 將採取合理且必要之安全措施，保護您的個人資料免於遺失、遭竊、未經授權存取、竄改、洩漏或不當使用。</p><p>惟網路資料傳輸無法保證百分之百安全，請您妥善保管會員帳號、密碼及個人裝置，並避免於公共電腦或不安全網路環境中登入會員帳號或進行付款操作。</p>","titleColor":"#0f172a"}]},{"num":"08","title":"當事人權利","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>依個人資料保護法規定，您得就 HOVER 所保有之個人資料，向我們行使以下權利：</p><ul><li>查詢或請求閱覽。</li><li>請求製給複製本。</li><li>請求補充或更正。</li><li>請求停止蒐集、處理或利用。</li><li>請求刪除。</li></ul><p>若您欲行使上述權利，可透過 HOVER 官方客服與我們聯繫。HOVER 將依相關法令及內部作業程序協助處理。</p>","titleColor":"#0f172a"}]},{"num":"09","title":"不提供資料之影響","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>您可自由選擇是否提供個人資料。惟若您拒絕提供完成會員註冊、訂單成立、付款確認、商品配送、退貨退款、客服處理或電子發票開立所必要之資料，HOVER 可能無法提供相關服務或完成交易流程。</p>","titleColor":"#0f172a"}]},{"num":"10","title":"未成年人保護","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>若您為未成年人，請於法定代理人閱讀、瞭解並同意本隱私權保護政策後，再使用本網站服務或進行購物。</p><p>若您已使用本網站服務或完成訂購，HOVER 將視為您已取得法定代理人之同意。</p>","titleColor":"#0f172a"}]},{"num":"11","title":"政策修改","titleColor":"#2a514d","items":[{"title":"","collapsible":false,"contentHtml":"<p>HOVER 保留依服務內容、營運需求或法令變更修改本隱私權保護政策之權利。</p><p>修改後之內容將公告於本網站，並自公告日起生效。建議您定期查閱本政策，以了解 HOVER 如何保護您的個人資料與隱私權。</p>","titleColor":"#0f172a"}]}]}}
HPOL_LEGAL_DEFAULTS_JSON;
    $legal = json_decode($legal_json, true);
    if (is_array($legal)) {
        foreach (['terms', 'privacy'] as $legal_key) {
            if (!empty($legal[$legal_key]) && is_array($legal[$legal_key])) {
                $cached[$legal_key] = $legal[$legal_key];
            }
        }
    }

    return $cached;
}

function hpol_page_labels(): array {
    return [
        'how-to-buy' => '如何購買',
        'returns'    => '申請退貨',
        'faq'        => '常見問題',
        'terms'      => '服務條款',
        'privacy'    => '隱私權保護',
    ];
}

function hpol_bool($v, bool $fallback = false): bool {
    if (is_bool($v)) return $v;
    if ($v === 1 || $v === '1' || $v === 'true') return true;
    if ($v === 0 || $v === '0' || $v === 'false') return false;
    return $fallback;
}

function hpol_hex_color($value, string $fallback): string {
    $color = sanitize_hex_color((string) ($value ?? ''));
    return $color ?: $fallback;
}

/** 允許編輯器內聯文字顏色（span style） */
function hpol_kses_content(string $content): string {
    $allowed = wp_kses_allowed_html('post');
    if (!isset($allowed['span'])) {
        $allowed['span'] = [];
    }
    $allowed['span']['style'] = true;
    $allowed['span']['class'] = true;
    if (!isset($allowed['a'])) {
        $allowed['a'] = [];
    }
    $allowed['a']['href'] = true;
    $allowed['a']['title'] = true;
    $allowed['a']['target'] = true;
    $allowed['a']['rel'] = true;
    $allowed['a']['style'] = true;
    return wp_kses($content, $allowed);
}

function hpol_normalize_item(array $item): ?array {
    $title = sanitize_text_field($item['title'] ?? '');
    // 編輯器回傳的段落是空行格式（wp.editor.getContent 會把 <p> 還原成換行），
    // 先 wpautop 還原段落，前台才不會整段黏在一起。
    $raw_content = (string) ($item['contentHtml'] ?? $item['content'] ?? '');
    $content = hpol_kses_content(wpautop($raw_content));

    // legacy paragraphs
    if ($content === '' && (isset($item['paragraphs']) || isset($item['list']))) {
        $parts = [];
        foreach (($item['paragraphs'] ?? []) as $p) {
            $p = sanitize_textarea_field((string) $p);
            if ($p !== '') $parts[] = '<p>' . esc_html($p) . '</p>';
        }
        $lis = [];
        foreach (($item['list'] ?? []) as $li) {
            $li = sanitize_textarea_field((string) $li);
            if ($li !== '') $lis[] = '<li>' . esc_html($li) . '</li>';
        }
        if ($lis) $parts[] = '<ul>' . implode('', $lis) . '</ul>';
        foreach (($item['links'] ?? []) as $link) {
            if (!is_array($link)) continue;
            $label = sanitize_text_field($link['label'] ?? '');
            $href = esc_url_raw((string) ($link['href'] ?? ''));
            if ($label && $href) {
                $parts[] = '<p><a href="' . esc_url($href) . '" target="_blank" rel="noopener noreferrer">' . esc_html($label) . '</a></p>';
            }
        }
        $content = implode('', $parts);
    }

    $plain = trim(wp_strip_all_tags($content));
    if ($title === '' && $plain === '') return null;

    return [
        'title'       => $title,
        'titleColor'  => hpol_hex_color($item['titleColor'] ?? $item['title_color'] ?? '', '#0f172a'),
        'collapsible' => hpol_bool($item['collapsible'] ?? null, $title !== ''),
        'contentHtml' => $content,
    ];
}

function hpol_normalize_section(array $section, int $index): ?array {
    $title = sanitize_text_field($section['title'] ?? '');
    if ($title === '') return null;

    $num = sanitize_text_field($section['num'] ?? '');
    if ($num === '') $num = str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);

    $items = [];
    if (!empty($section['items']) && is_array($section['items'])) {
        foreach ($section['items'] as $raw) {
            if (!is_array($raw)) continue;
            $n = hpol_normalize_item($raw);
            if ($n) $items[] = $n;
        }
    } elseif (!empty($section['subSections']) && is_array($section['subSections'])) {
        // 舊導言段落 → 改成一筆不收折內層（相容）
        if (!empty($section['paragraphs']) || !empty($section['introHtml'])) {
            $intro = (string) ($section['introHtml'] ?? '');
            if ($intro === '' && !empty($section['paragraphs'])) {
                $parts = [];
                foreach ($section['paragraphs'] as $p) {
                    $p = sanitize_textarea_field((string) $p);
                    if ($p !== '') $parts[] = '<p>' . esc_html($p) . '</p>';
                }
                $intro = implode('', $parts);
            }
            if (trim(wp_strip_all_tags($intro)) !== '') {
                $n = hpol_normalize_item([
                    'title' => '',
                    'collapsible' => false,
                    'contentHtml' => $intro,
                ]);
                if ($n) $items[] = $n;
            }
        }
        foreach ($section['subSections'] as $sub) {
            if (!is_array($sub)) continue;
            $n = hpol_normalize_item($sub + ['collapsible' => true]);
            if ($n) $items[] = $n;
        }
    } elseif (isset($section['contentHtml']) || isset($section['heading'])) {
        $n = hpol_normalize_item([
            'title' => $section['heading'] ?? '',
            'collapsible' => false,
            'contentHtml' => $section['contentHtml'] ?? '',
        ]);
        if ($n) $items[] = $n;
    } elseif (!empty($section['paragraphs']) || !empty($section['list'])) {
        $n = hpol_normalize_item([
            'title' => '',
            'collapsible' => false,
            'paragraphs' => $section['paragraphs'] ?? [],
            'list' => $section['list'] ?? [],
        ]);
        if ($n) $items[] = $n;
    }

    return [
        'num'        => $num,
        'title'      => $title,
        'titleColor' => hpol_hex_color($section['titleColor'] ?? $section['title_color'] ?? '', '#4b5563'),
        'items'      => $items,
    ];
}

function hpol_normalize_page(array $page, string $key): array {
    $defaults = hpol_defaults_raw();
    $fallback = $defaults[$key] ?? [
        'pageTitle' => hpol_page_labels()[$key] ?? $key,
        'intro' => '',
        'contentColor' => '#2a514d',
        'sections' => [],
    ];
    $color = sanitize_hex_color($page['contentColor'] ?? '') ?: ($fallback['contentColor'] ?? '#2a514d');
    $sections = [];
    foreach (($page['sections'] ?? []) as $i => $section) {
        if (!is_array($section)) continue;
        $n = hpol_normalize_section($section, (int) $i);
        if ($n) $sections[] = $n;
    }
    if (empty($sections)) $sections = $fallback['sections'] ?? [];
    return [
        'pageTitle' => sanitize_text_field($page['pageTitle'] ?? $fallback['pageTitle']) ?: $fallback['pageTitle'],
        'intro' => sanitize_textarea_field($page['intro'] ?? $fallback['intro'] ?? ''),
        'contentColor' => $color,
        'sections' => $sections,
    ];
}

function hpol_normalize_bundle(array $data): array {
    $defaults = hpol_defaults_raw();
    $out = [];
    foreach (HPOL_PAGE_KEYS as $key) {
        $raw = is_array($data[$key] ?? null) ? $data[$key] : ($defaults[$key] ?? []);
        $out[$key] = hpol_normalize_page($raw, $key);
    }
    return $out;
}

function hpol_get_settings(): array {
    $saved = get_option(HPOL_OPTION, null);
    if (!is_array($saved) || empty($saved)) {
        return hpol_normalize_bundle(hpol_defaults_raw());
    }
    return hpol_normalize_bundle($saved);
}

function hpol_get_page(string $key): array {
    $all = hpol_get_settings();
    return $all[$key] ?? hpol_normalize_page([], 'how-to-buy');
}

add_action('admin_menu', function () {
    if (!current_user_can('manage_options')) return;
    add_menu_page('HOVER 說明頁', 'HOVER 說明頁', 'manage_options', 'hpol', 'hpol_render_page', 'dashicons-editor-ul', 58);
}, 99);

add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_hpol') return;
    wp_enqueue_editor();
    wp_enqueue_media();
});

add_action('admin_footer', 'hpol_admin_footer_script');

add_action('rest_api_init', function () {
    register_rest_route('hover/v1', '/policy-pages', [
        'methods' => 'GET', 'callback' => 'hpol_rest_all', 'permission_callback' => '__return_true',
    ]);
    register_rest_route('hover/v1', '/policy-pages/(?P<page>how-to-buy|returns|faq|terms|privacy)', [
        'methods' => 'GET', 'callback' => 'hpol_rest_one', 'permission_callback' => '__return_true',
    ]);
});

function hpol_rest_all(): WP_REST_Response {
    return new WP_REST_Response(['ok' => true, 'pages' => hpol_get_settings()], 200);
}

function hpol_rest_one(WP_REST_Request $request): WP_REST_Response {
    $page = sanitize_text_field((string) $request['page']);
    return new WP_REST_Response(['ok' => true, 'page' => $page, 'data' => hpol_get_page($page)], 200);
}

function hpol_save_from_post(): ?array {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['hpol_act'])) return null;
    if (!wp_verify_nonce($_POST['hpol_nonce'] ?? '', 'hpol_save')) {
        return ['ok' => false, 'msg' => '安全驗證失敗，請重新整理後再試。'];
    }
    if (!current_user_can('manage_options')) return ['ok' => false, 'msg' => '權限不足。'];
    $act = sanitize_text_field($_POST['hpol_act']);
    if ($act === 'reset') {
        delete_option(HPOL_OPTION);
        return ['ok' => true, 'msg' => '已還原為預設說明頁內容。'];
    }
    if ($act !== 'save') return null;
    $raw = json_decode(wp_unslash($_POST['hpol_payload'] ?? ''), true);
    if (!is_array($raw)) return ['ok' => false, 'msg' => '資料格式錯誤。'];
    update_option(HPOL_OPTION, hpol_normalize_bundle($raw), false);
    return ['ok' => true, 'msg' => '說明頁內容已儲存。'];
}

function hpol_render_page(): void {
    if (!current_user_can('manage_options')) wp_die('權限不足');
    $flash = hpol_save_from_post();
    $s = hpol_get_settings();
    $payload = wp_json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $labels = hpol_page_labels();
    $api_url = rest_url('hover/v1/policy-pages');
    ?>
    <div class="wrap hover-pol-admin">
        <div class="hpol-topbar">
            <div>
                <h1>HOVER 說明頁</h1>
                <p class="description">大標題／內層標題可選顏色；內容編輯器可設文字色與連結。大標題強制收折。</p>
            </div>
            <button type="submit" form="hpol-form" class="button button-primary button-hero">儲存設定</button>
        </div>
        <?php if ($flash) : ?>
            <div class="notice <?php echo $flash['ok'] ? 'notice-success' : 'notice-error'; ?> is-dismissible"><p><?php echo esc_html($flash['msg']); ?></p></div>
        <?php endif; ?>
        <div class="hpol-api-pill"><code><?php echo esc_html($api_url); ?></code></div>
        <form id="hpol-form" method="post">
            <?php wp_nonce_field('hpol_save', 'hpol_nonce'); ?>
            <input type="hidden" name="hpol_act" value="save">
            <input type="hidden" name="hpol_payload" id="hpol-payload" value="">
            <div class="hpol-tabs">
                <?php foreach ($labels as $key => $label) : ?>
                    <button type="button" class="hpol-tab<?php echo $key === 'how-to-buy' ? ' is-active' : ''; ?>" data-page="<?php echo esc_attr($key); ?>"><?php echo esc_html($label); ?></button>
                <?php endforeach; ?>
            </div>
            <div id="hpol-editor"></div>
            <div class="hpol-foot"><?php submit_button('儲存設定', 'primary large', 'submit', false); ?></div>
        </form>
        <form method="post" class="hpol-reset-form" onsubmit="return confirm('確定還原全部說明頁為預設內容？');">
            <?php wp_nonce_field('hpol_save', 'hpol_nonce'); ?>
            <input type="hidden" name="hpol_act" value="reset">
            <button type="submit" class="button-link-delete">還原預設</button>
        </form>
    </div>
    <script>
    window.HPOL_DATA = <?php echo $payload ?: '{}'; ?>;
    window.HPOL_LABELS = <?php echo wp_json_encode($labels, JSON_UNESCAPED_UNICODE); ?>;
    </script>
    <style>
        .hover-pol-admin{max-width:980px}
        .hover-pol-admin .hpol-topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}
        .hover-pol-admin .hpol-topbar h1{margin:0 0 6px}
        .hover-pol-admin .hpol-api-pill{display:inline-flex;margin-bottom:16px;padding:8px 14px;border:1px solid #dcdcde;border-radius:999px;background:#fff;font-size:12px}
        .hover-pol-admin .hpol-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
        .hover-pol-admin .hpol-tab{border:1px solid #dcdcde;background:#fff;border-radius:999px;padding:8px 16px;cursor:pointer;font-weight:600;font-size:13px}
        .hover-pol-admin .hpol-tab.is-active{background:#2a514d;color:#fff;border-color:#2a514d}
        .hover-pol-admin .hpol-card{background:#fff;border:1px solid #dcdcde;border-radius:8px;margin-bottom:16px;overflow:hidden}
        .hover-pol-admin .hpol-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;border-bottom:1px solid #f0f0f1}
        .hover-pol-admin .hpol-card-head h2{margin:0;font-size:14px;font-weight:700}
        .hover-pol-admin .hpol-card-body{padding:18px}
        .hover-pol-admin .hpol-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px}
        .hover-pol-admin .hpol-span-2{grid-column:1/-1}
        .hover-pol-admin .hpol-field{display:flex;flex-direction:column;gap:6px}
        .hover-pol-admin .hpol-label{font-weight:600;font-size:13px}
        .hover-pol-admin .hpol-section{border:1px solid #e2e4e7;border-radius:8px;background:#f7f7f7;padding:14px;margin-bottom:14px}
        .hover-pol-admin .hpol-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
        .hover-pol-admin .hpol-section-title{font-weight:700;font-size:13px}
        .hover-pol-admin .hpol-item{border:1px dashed #c3c4c7;border-radius:8px;background:#fff;padding:12px;margin-top:10px}
        .hover-pol-admin .hpol-item-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
        .hover-pol-admin .hpol-actions{display:flex;gap:6px;flex-wrap:wrap}
        .hover-pol-admin .hpol-switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer;user-select:none;font-size:13px}
        .hover-pol-admin .hpol-switch input{margin:0}
        .hover-pol-admin .hpol-muted{color:#646970;font-size:12px;margin:0}
        .hover-pol-admin .hpol-color-row{display:flex;align-items:center;gap:8px}
        .hover-pol-admin .hpol-color-row input[type=color]{width:42px;height:32px;padding:0;border:1px solid #dcdcde;border-radius:4px;background:#fff}
        .hover-pol-admin .hpol-color-row input[type=text]{max-width:110px}
        .hover-pol-admin input[type=text]{width:100%}
        .hover-pol-admin .hpol-editor-wrap{margin-top:6px;background:#fff}
        .hover-pol-admin .hpol-reset-form{margin-top:8px}
        @media(max-width:782px){.hover-pol-admin .hpol-grid-2{grid-template-columns:1fr}}
    </style>
    <?php
}

function hpol_admin_footer_script(): void {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_hpol') return;
    ?>
    <script>
    jQuery(function($){
        var state = $.extend(true, {}, window.HPOL_DATA || {});
        var labels = window.HPOL_LABELS || {};
        var activePage = 'how-to-buy';
        var editorIds = [];

        function esc(s){ return $('<div/>').text(s || '').html(); }
        function ensurePage(key){
            if (!state[key]) state[key] = { pageTitle: labels[key]||key, intro:'', contentColor:'#2a514d', sections:[] };
            if (!Array.isArray(state[key].sections)) state[key].sections = [];
            state[key].sections.forEach(function(sec){
                if (!Array.isArray(sec.items)) sec.items = [];
                if (!sec.titleColor) sec.titleColor = '#4b5563';
                sec.items.forEach(function(item){
                    if (!item.titleColor) item.titleColor = '#0f172a';
                });
            });
        }
        function destroyEditors(){
            editorIds.forEach(function(id){
                if (window.wp && wp.editor && wp.editor.remove) { try { wp.editor.remove(id); } catch(e){} }
            });
            editorIds = [];
        }
        function initEditors(){
            if (!(window.wp && wp.editor && wp.editor.initialize)) return;
            editorIds.forEach(function(id){
                wp.editor.initialize(id, {
                    tinymce: {
                        // 關閉 wpautop：存檔前不跑 removep，按 Enter 的空行才不會被吃掉
                        wpautop: false,
                        plugins: 'lists,link,paste,textcolor,colorpicker,wordpress,wplink',
                        toolbar1: 'formatselect,bold,italic,forecolor,bullist,numlist,link,unlink,undo,redo,removeformat',
                        height: 180
                    },
                    quicktags: true,
                    mediaButtons: false
                });
            });
        }
        function getEditorHtml(id){
            if (window.wp && wp.editor && wp.editor.getContent) {
                try { return wp.editor.getContent(id) || ''; } catch(e){}
            }
            var el = document.getElementById(id);
            return el ? (el.value || '') : '';
        }
        function syncPayload(){ $('#hpol-payload').val(JSON.stringify(state)); }
        function moveItem(arr, index, dir){
            var next = index + dir;
            if (next < 0 || next >= arr.length) return;
            var tmp = arr[index]; arr[index] = arr[next]; arr[next] = tmp;
        }
        function colorField(className, value, fallback){
            var v = value || fallback;
            return '<div class="hpol-color-row">'
                + '<input type="color" class="'+className+'-picker" value="'+esc(v)+'">'
                + '<input type="text" class="'+className+'" value="'+esc(v)+'" placeholder="'+esc(fallback)+'">'
                + '</div>';
        }

        function refreshFromEditorsThen(fn){
            ensurePage(activePage);
            var page = state[activePage];
            page.pageTitle = String($('[data-field="pageTitle"]').val() || '').trim();
            page.contentColor = String($('[data-field="contentColor"]').val() || '#2a514d').trim();
            page.intro = String($('[data-field="intro"]').val() || '');
            var sections = [];
            $('#hpol-sections .hpol-section').each(function(){
                var $sec = $(this);
                var items = [];
                $sec.find('.hpol-item').each(function(){
                    var $item = $(this);
                    var id = $item.find('textarea.hpol-content').attr('id');
                    items.push({
                        title: String($item.find('.hpol-item-title-input').val() || '').trim(),
                        titleColor: String($item.find('.hpol-item-title-color').val() || '#0f172a').trim(),
                        collapsible: $item.find('.hpol-item-collapse').is(':checked'),
                        contentHtml: id ? getEditorHtml(id) : ''
                    });
                });
                sections.push({
                    num: String($sec.find('.hpol-num').val() || '').trim(),
                    title: String($sec.find('.hpol-sec-title').val() || '').trim(),
                    titleColor: String($sec.find('.hpol-sec-title-color').val() || '#4b5563').trim(),
                    items: items
                });
            });
            page.sections = sections;
            syncPayload();
            if (fn) fn();
        }

        function renderFresh(){
            destroyEditors();
            ensurePage(activePage);
            var page = state[activePage];
            var html = '';
            html += '<div class="hpol-card"><div class="hpol-card-head"><h2>頁面設定 — '+esc(labels[activePage]||activePage)+'</h2></div><div class="hpol-card-body hpol-grid-2">';
            html += '<div class="hpol-field"><label class="hpol-label">頁面大標</label><input type="text" data-field="pageTitle" value="'+esc(page.pageTitle||'')+'"></div>';
            html += '<div class="hpol-field"><label class="hpol-label">內容預設文字顏色</label><input type="text" class="hpol-color" data-field="contentColor" value="'+esc(page.contentColor||'#2a514d')+'"></div>';
            html += '<div class="hpol-field hpol-span-2"><label class="hpol-label">頁首說明（選填）</label><textarea data-field="intro" rows="2" style="width:100%">'+esc(page.intro||'')+'</textarea><p class="hpol-muted">主要用於申請退貨頁首。</p></div>';
            html += '</div></div>';

            html += '<div class="hpol-card"><div class="hpol-card-head"><h2>大標題項目（強制收折）</h2><button type="button" class="button" id="hpol-add-section">新增大標題</button></div>';
            html += '<div class="hpol-card-body" id="hpol-sections"></div></div>';
            $('#hpol-editor').html(html);

            var $wrap = $('#hpol-sections');
            editorIds = [];
            var pageKey = activePage.replace(/[^a-z0-9\-]/g,'');

            (page.sections || []).forEach(function(section, si){
                var box = $('<div class="hpol-section" data-si="'+si+'"></div>');
                var head = '<div class="hpol-section-head"><div class="hpol-section-title">大標題 '+(si+1)+'（外層強制收折）</div><div class="hpol-actions">';
                head += '<button type="button" class="button button-small hpol-sec-up" '+(si===0?'disabled':'')+'>↑</button>';
                head += '<button type="button" class="button button-small hpol-sec-down" '+(si===page.sections.length-1?'disabled':'')+'>↓</button>';
                head += '<button type="button" class="button-link-delete hpol-sec-del">刪除</button></div></div>';
                box.append(head);

                var body = '<div class="hpol-grid-2">';
                body += '<div class="hpol-field"><label class="hpol-label">編號</label><input type="text" class="hpol-num" value="'+esc(section.num||'')+'" placeholder="01"></div>';
                body += '<div class="hpol-field"><label class="hpol-label">大標題顏色</label>'+colorField('hpol-sec-title-color', section.titleColor, '#4b5563')+'</div>';
                body += '<div class="hpol-field hpol-span-2"><label class="hpol-label">大標題（粗體）</label><input type="text" class="hpol-sec-title" value="'+esc(section.title||'')+'" placeholder="例如：配送方式"></div>';
                body += '</div>';

                body += '<div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center"><strong style="font-size:13px">內層項目</strong>';
                body += '<button type="button" class="button hpol-add-item">新增內層項目</button></div>';
                body += '<div class="hpol-items"></div>';
                box.append(body);

                var $items = box.find('.hpol-items');
                (section.items || []).forEach(function(item, ui){
                    var editorId = 'hpol-content-'+pageKey+'-'+si+'-'+ui;
                    editorIds.push(editorId);
                    var sub = $('<div class="hpol-item" data-ui="'+ui+'"></div>');
                    var sh = '<div class="hpol-item-head"><strong>內層 '+(ui+1)+'</strong><div class="hpol-actions">';
                    sh += '<button type="button" class="button button-small hpol-item-up" '+(ui===0?'disabled':'')+'>↑</button>';
                    sh += '<button type="button" class="button button-small hpol-item-down" '+(ui===(section.items.length-1)?'disabled':'')+'>↓</button>';
                    sh += '<button type="button" class="button-link-delete hpol-item-del">刪除</button></div></div>';
                    sub.append(sh);
                    var sb = '';
                    sb += '<div class="hpol-grid-2">';
                    sb += '<div class="hpol-field hpol-span-2"><label class="hpol-label">內層標題（如：超商取貨｜不付款，可空白）</label>';
                    sb += '<input type="text" class="hpol-item-title-input" value="'+esc(item.title||'')+'"></div>';
                    sb += '<div class="hpol-field"><label class="hpol-label">內層標題顏色</label>'+colorField('hpol-item-title-color', item.titleColor, '#0f172a')+'</div>';
                    sb += '<div class="hpol-field"><label class="hpol-label">&nbsp;</label><label class="hpol-switch"><input type="checkbox" class="hpol-item-collapse" '+(item.collapsible ? 'checked' : '')+'> 啟用收折</label></div>';
                    sb += '</div>';
                    sb += '<div class="hpol-field" style="margin-top:10px"><label class="hpol-label">內容（可設文字色、連結，可空白）</label>';
                    sb += '<div class="hpol-editor-wrap"><textarea id="'+editorId+'" class="hpol-content" rows="5">'+esc(item.contentHtml||'')+'</textarea></div></div>';
                    sub.append(sb);
                    $items.append(sub);
                });

                $wrap.append(box);
            });

            setTimeout(initEditors, 80);
            syncPayload();
        }

        $(document).on('input change', '.hpol-sec-title-color-picker, .hpol-item-title-color-picker', function(){
            var $picker = $(this);
            var $text = $picker.siblings('input[type=text]');
            $text.val($picker.val());
        });
        $(document).on('input change', '.hpol-sec-title-color, .hpol-item-title-color', function(){
            var val = String($(this).val() || '');
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                $(this).siblings('input[type=color]').val(val);
            }
        });

        $(document).on('click', '.hpol-tab', function(){
            var next = String($(this).data('page'));
            refreshFromEditorsThen(function(){
                destroyEditors();
                activePage = next;
                $('.hpol-tab').removeClass('is-active');
                $('.hpol-tab[data-page="'+activePage+'"]').addClass('is-active');
                renderFresh();
            });
        });

        $(document).on('click', '#hpol-add-section', function(){
            refreshFromEditorsThen(function(){
                var n = state[activePage].sections.length + 1;
                state[activePage].sections.push({
                    num: String(n).padStart(2,'0'),
                    title: '新大標題',
                    titleColor: '#4b5563',
                    items: [{ title: '新內層項目', titleColor: '#0f172a', collapsible: true, contentHtml: '' }]
                });
                destroyEditors();
                renderFresh();
            });
        });

        $(document).on('click', '.hpol-sec-del', function(){
            var si = Number($(this).closest('.hpol-section').data('si'));
            refreshFromEditorsThen(function(){
                state[activePage].sections.splice(si,1);
                destroyEditors();
                renderFresh();
            });
        });
        $(document).on('click', '.hpol-sec-up', function(){
            var si = Number($(this).closest('.hpol-section').data('si'));
            refreshFromEditorsThen(function(){ moveItem(state[activePage].sections, si, -1); destroyEditors(); renderFresh(); });
        });
        $(document).on('click', '.hpol-sec-down', function(){
            var si = Number($(this).closest('.hpol-section').data('si'));
            refreshFromEditorsThen(function(){ moveItem(state[activePage].sections, si, 1); destroyEditors(); renderFresh(); });
        });

        $(document).on('click', '.hpol-add-item', function(){
            var si = Number($(this).closest('.hpol-section').data('si'));
            refreshFromEditorsThen(function(){
                if (!state[activePage].sections[si].items) state[activePage].sections[si].items = [];
                state[activePage].sections[si].items.push({ title:'新內層項目', titleColor:'#0f172a', collapsible:true, contentHtml:'' });
                destroyEditors();
                renderFresh();
            });
        });
        $(document).on('click', '.hpol-item-del', function(){
            var $sec = $(this).closest('.hpol-section');
            var si = Number($sec.data('si'));
            var ui = Number($(this).closest('.hpol-item').data('ui'));
            refreshFromEditorsThen(function(){
                state[activePage].sections[si].items.splice(ui,1);
                destroyEditors();
                renderFresh();
            });
        });
        $(document).on('click', '.hpol-item-up', function(){
            var $sec = $(this).closest('.hpol-section');
            var si = Number($sec.data('si'));
            var ui = Number($(this).closest('.hpol-item').data('ui'));
            refreshFromEditorsThen(function(){ moveItem(state[activePage].sections[si].items, ui, -1); destroyEditors(); renderFresh(); });
        });
        $(document).on('click', '.hpol-item-down', function(){
            var $sec = $(this).closest('.hpol-section');
            var si = Number($sec.data('si'));
            var ui = Number($(this).closest('.hpol-item').data('ui'));
            refreshFromEditorsThen(function(){ moveItem(state[activePage].sections[si].items, ui, 1); destroyEditors(); renderFresh(); });
        });

        $('#hpol-form').on('submit', function(){
            refreshFromEditorsThen(function(){});
            destroyEditors();
            syncPayload();
        });

        renderFresh();
    });
    </script>
    <?php
}
