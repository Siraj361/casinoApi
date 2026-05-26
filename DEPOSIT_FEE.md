Deposit fee (1%) implementation

Summary
- When an admin approves a deposit request, the backend now deducts a 1% platform fee from the deposited atomic amount and credits the user's wallet with the net amount.
- The deducted fee is recorded in the `platform_profits` table with `commission_type = deposit_fee`.

Files changed
- Controller/DepositRequestController/DepositRequestController.js
  - `approveDepositRequest` now:
    - Calculates `feeAtomic = amountAtomic / 100` (1%)
    - Credits `wallet.balance_atomic` with `amountAtomic - feeAtomic`
    - Creates a `platform_profits` record for the fee

Behavior / API
- Endpoint (admin only): PUT /deposit-request/approve/:requestId
  - Caller must be authenticated as admin (uses existing `IsAdmin` middleware).
  - Request flow unchanged; on success the deposit request status becomes `completed` and wallet balance increases by net amount.

- Endpoint (admin only): PUT /deposit/confirm/:id
  - Confirms a `Deposit` row created by `/deposit/crypto` (or external processing) and credits the user's wallet after deducting 1%.
  - Use same admin auth middleware; on success deposit `status` becomes `confirmed` and a `platform_profits` row is created.

- Endpoint (admin only): GET /admin/profits/total
  - Returns platform total profit across `platform_profits`.
  - Optional query params:
    - `commission_type` (e.g. `deposit_fee`)
    - `currency_network_id`
    - `from` / `to`

DB impact
- No schema changes required. Fees are stored using existing `platform_profits` model.
- `platform_profits` fields set include: `user_id`, `currency_network_id`, `commission_atomic` (fee in atomic units), `commission_type: deposit_fee`, `commission_rate_bps: 100`.

Configuration
- The fee rate is currently hard-coded to 1% (100 bps) in the controller.
- To make it configurable, store `PLATFORM_FEE_BPS` in `app_settings` and read it in the controller (suggested improvement).

Testing
1. Create a deposit request (user flow) or use demo endpoint:
   - POST to `/cashier/deposit/create` or `/deposit-request/create` depending on your UI
2. As admin, call the approve endpoint:

```bash
curl -X PUT \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  https://<HOST>/deposit-request/approve/<REQUEST_ID>
```

3. Verify:
   - User's wallet `balance_atomic` increased by `amount - floor(amount * 0.01)`
   - A new row exists in `platform_profits` with `commission_atomic` equal to the deducted fee

Notes & Next steps
- Add unit/integration tests for `approveDepositRequest` to validate fee deduction and platform_profits creation.
- Consider also applying the same fee logic for any other deposit-crediting flows (auto-confirmed crypto deposits) if present.

If you want, I can:
- Make the fee configurable via `app_settings` and `PLATFORM_FEE_BPS`.
- Add tests for the controller change.
