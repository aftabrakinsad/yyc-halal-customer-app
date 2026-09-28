-- The audit trail is permanent: block UPDATE and DELETE on "AuditLog" at the database level,
-- so neither app (nor a bug in either) can rewrite history.
CREATE OR REPLACE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();

-- Money and quantity sanity checks enforced by the database.
ALTER TABLE "Product"   ADD CONSTRAINT product_price_nonnegative CHECK ("priceCents" >= 0);
ALTER TABLE "Order"     ADD CONSTRAINT order_totals_nonnegative  CHECK ("subtotalCents" >= 0 AND "taxCents" >= 0 AND "totalCents" >= 0);
ALTER TABLE "Order"     ADD CONSTRAINT order_refund_within_total CHECK ("refundedCents" >= 0 AND "refundedCents" <= "totalCents");
ALTER TABLE "OrderItem" ADD CONSTRAINT order_item_quantity_positive CHECK ("quantity" > 0);
ALTER TABLE "Refund"    ADD CONSTRAINT refund_amount_positive CHECK ("amountCents" > 0);
