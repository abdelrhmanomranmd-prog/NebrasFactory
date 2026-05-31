-- ============================================================
-- 007 — إرسال اختياري: المبيعات / خدمة العملاء + صيغة الرسالة
-- لا يحتاج DDL — الحقول تُخزَّن داخل payload (jsonb):
--   messageFormat: 'a4-quote' | 'cart-order'
--   sentToChannel: 'sales' | 'customer-service'
--   quoteType: 'quote' | 'order'
--   quoteDocumentCloudUrl: رابط صورة مستند A4
--   adminDailyIssued / adminDailyFinalized: إحصائيات يومية (إدارة فقط)
-- نفّذي للتحقق فقط (اختياري):
-- ============================================================

select
  quote_number,
  payload->>'messageFormat' as message_format,
  payload->>'sentToChannel' as sent_to_channel,
  payload->>'quoteDocumentCloudUrl' as quote_doc_url,
  payload->>'adminDailyIssued' as admin_issued,
  payload->>'adminDailyFinalized' as admin_finalized,
  status,
  created_at
from public.nebras_sales_quotes
order by created_at desc
limit 10;
