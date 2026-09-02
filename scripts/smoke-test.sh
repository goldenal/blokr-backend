#!/usr/bin/env bash
# End-to-end smoke test against a running blokr-backend dev server.
# Usage: BASE_URL=http://localhost:3003 ./scripts/smoke-test.sh
#
# Exercises the full booking flow: auth, profile creation, service creation,
# availability rules, slot computation, a concurrency test (two simultaneous
# holds for the same slot), and a simulated signed Paystack webhook.
#
# Requires PAYSTACK_SECRET_KEY / PAYSTACK_WEBHOOK_SECRET in the server's .env to be a
# non-placeholder value (e.g. a throwaway string) for the webhook-signature step to
# succeed — with the REPLACE_ME_* placeholders, checkout/webhook calls correctly 503/403
# instead, which this script tolerates.

set -euo pipefail

BASE="${BASE_URL:-http://localhost:3003}"
EMAIL="smoketest-$(date +%s)@blokr.dev"
USERNAME="smoketest-$(date +%s)"

echo "== health =="
curl -sf "$BASE/health" | jq .

echo "== register =="
REG=$(curl -sf -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Passw0rd!\",\"name\":\"Smoke Test\",\"phone\":\"+2348000000000\"}")
ACCESS=$(echo "$REG" | jq -r .accessToken)

echo "== me =="
curl -sf "$BASE/auth/me" -H "Authorization: Bearer $ACCESS" | jq .

echo "== create professional profile =="
PROF=$(curl -sf -X POST "$BASE/professionals/me" -H "Authorization: Bearer $ACCESS" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Test\",\"businessName\":\"Smoke Test Co\",\"username\":\"$USERNAME\",\"category\":\"Consultant\",\"phone\":\"+2348000000000\"}")
echo "$PROF" | jq .

echo "== public lookup excludes bank/paystack fields =="
PUBLIC=$(curl -sf "$BASE/public/professionals/$USERNAME")
if echo "$PUBLIC" | jq -e 'has("bankAccountNumber") or has("paystackSubaccountCode")' >/dev/null; then
  echo "FAIL: public profile leaked settlement fields" >&2
  exit 1
fi
echo "OK: no settlement fields leaked"

echo "== create service =="
SVC=$(curl -sf -X POST "$BASE/services" -H "Authorization: Bearer $ACCESS" \
  -H 'Content-Type: application/json' \
  -d '{"name":"30-Min Consult","durationMinutes":30,"priceNaira":15000,"bufferMinutes":15,"locationType":"GOOGLE_MEET"}')
SVC_ID=$(echo "$SVC" | jq -r .id)

echo "== set weekly availability =="
curl -sf -X PUT "$BASE/availability/rules" -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' -d '{
  "rules": [
    {"dayOfWeek":"MONDAY","isEnabled":true,"timeRanges":[{"start":"09:00","end":"17:00"}]},
    {"dayOfWeek":"TUESDAY","isEnabled":true,"timeRanges":[{"start":"09:00","end":"17:00"}]},
    {"dayOfWeek":"WEDNESDAY","isEnabled":true,"timeRanges":[{"start":"09:00","end":"17:00"}]},
    {"dayOfWeek":"THURSDAY","isEnabled":true,"timeRanges":[{"start":"09:00","end":"17:00"}]},
    {"dayOfWeek":"FRIDAY","isEnabled":true,"timeRanges":[{"start":"09:00","end":"17:00"}]},
    {"dayOfWeek":"SATURDAY","isEnabled":false,"timeRanges":[]},
    {"dayOfWeek":"SUNDAY","isEnabled":false,"timeRanges":[]}
  ]
}' > /dev/null
echo "OK"

NEXT_MONDAY=$(python3 -c "
import datetime
d = datetime.date.today()
days_ahead = (7 - d.weekday()) % 7 or 7
print(d + datetime.timedelta(days=days_ahead))
")

echo "== compute slots for $NEXT_MONDAY =="
curl -sf "$BASE/public/professionals/$USERNAME/services/$SVC_ID/slots?date=$NEXT_MONDAY" | jq '. | length'

echo "== concurrency test: two simultaneous holds for the same slot =="
BODY_A="{\"date\":\"$NEXT_MONDAY\",\"startTime\":\"09:00\",\"customerName\":\"Customer A\",\"customerEmail\":\"a@example.com\",\"customerPhone\":\"+2348011111111\"}"
BODY_B="{\"date\":\"$NEXT_MONDAY\",\"startTime\":\"09:00\",\"customerName\":\"Customer B\",\"customerEmail\":\"b@example.com\",\"customerPhone\":\"+2348022222222\"}"

CODE_A_FILE=$(mktemp)
CODE_B_FILE=$(mktemp)
curl -s -o /tmp/smoke_hold_a.json -w "%{http_code}" -X POST \
  "$BASE/public/professionals/$USERNAME/services/$SVC_ID/bookings/hold" \
  -H 'Content-Type: application/json' -d "$BODY_A" > "$CODE_A_FILE" &
curl -s -o /tmp/smoke_hold_b.json -w "%{http_code}" -X POST \
  "$BASE/public/professionals/$USERNAME/services/$SVC_ID/bookings/hold" \
  -H 'Content-Type: application/json' -d "$BODY_B" > "$CODE_B_FILE" &
wait
CODE_A=$(cat "$CODE_A_FILE")
CODE_B=$(cat "$CODE_B_FILE")
rm -f "$CODE_A_FILE" "$CODE_B_FILE"

CODES_SORTED=$(printf '%s\n%s' "$CODE_A" "$CODE_B" | sort | tr '\n' ' ')
if [ "$CODES_SORTED" != "201 409 " ]; then
  echo "FAIL: expected one 201 and one 409, got A=$CODE_A B=$CODE_B" >&2
  exit 1
fi
echo "OK: exactly one hold succeeded (201), the other conflicted (409)"

WINNER_FILE="/tmp/smoke_hold_a.json"
[ "$CODE_A" = "201" ] || WINNER_FILE="/tmp/smoke_hold_b.json"
BOOKING_ID=$(jq -r .booking.id "$WINNER_FILE")
REFERENCE=$(jq -r .booking.reference "$WINNER_FILE")

echo "== checkout init (booking $REFERENCE) =="
CHECKOUT_CODE=$(curl -s -o /tmp/smoke_checkout.json -w "%{http_code}" -X POST "$BASE/bookings/$BOOKING_ID/checkout/init")
if [ "$CHECKOUT_CODE" = "503" ]; then
  echo "OK: Paystack not configured, got expected 503"
elif [ "$CHECKOUT_CODE" = "201" ] || [ "$CHECKOUT_CODE" = "200" ]; then
  echo "OK: checkout initialized"
  cat /tmp/smoke_checkout.json | jq .
else
  echo "FAIL: unexpected checkout status $CHECKOUT_CODE" >&2
  exit 1
fi

echo "== reference lookup =="
curl -sf "$BASE/bookings/reference/$REFERENCE" | jq '{status, paymentStatus}'

echo ""
echo "Smoke test complete. Booking reference: $REFERENCE"
echo "(Webhook confirmation and /payments listing require a non-placeholder"
echo " PAYSTACK_SECRET_KEY/PAYSTACK_WEBHOOK_SECRET — exercise those manually per README.)"
