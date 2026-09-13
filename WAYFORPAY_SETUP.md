# WayForPay billing setup

The app creates a one-time order for the selected monthly plan and redirects the studio owner to the protected WayForPay checkout. It does not enable automatic card charges.

## 1. Run the database migration

In **Supabase → SQL Editor**, open and run the full contents of `supabase/migrations/002_wayforpay_billing.sql`. This records locally-created orders before the payer is redirected to WayForPay.

## 2. Add Vercel variables

Add all variables to **Production, Preview, Development**:

- `WAYFORPAY_MERCHANT_ACCOUNT` — **Config**;
- `WAYFORPAY_SECRET_KEY` — **Secret**;
- `WAYFORPAY_MERCHANT_DOMAIN` — **Config**, currently `detailflow-xi.vercel.app`;
- `WAYFORPAY_APP_URL` — **Config**, currently `https://detailflow-xi.vercel.app`.

Never share or put `WAYFORPAY_SECRET_KEY` in a `VITE_` variable. The API uses it to sign checkout data and verifies the signature from the payment callback before activating a tariff.

## 3. Deploy and configure WayForPay

Redeploy after adding the variables. In WayForPay, use these addresses for the current Vercel deployment:

- return URL: `https://detailflow-xi.vercel.app/api/wayforpay/return`
- service/callback URL: `https://detailflow-xi.vercel.app/api/wayforpay/callback`

WayForPay signs checkout parameters and notifications with HMAC-MD5. It may resend a callback until it receives the signed `accept` response, which the callback endpoint returns after processing a valid request.
