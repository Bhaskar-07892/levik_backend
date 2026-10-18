import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Levik Rewards Programme schema.
 * Business logic lives in the NestJS services; the database still enforces the guarantees that must
 * never break even if application code has a bug: one credit per scan/invoice/redemption, one approved
 * claim per serial, non-negative stock, append-only ledger/audit/history.
 */
export class InitialSchema1760900000000 implements MigrationInterface {
  name = 'InitialSchema1760900000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      -- ------------------------------------------------------------------ enums
      create type user_role as enum ('plumber', 'retailer');
      create type plumber_verification_status as enum ('Verified', 'Pending', 'Rejected');
      create type account_status as enum ('Active', 'Suspended', 'Inactive');
      create type retailer_verification_status as enum ('Approved', 'Pending', 'Rejected');
      create type product_category as enum (
        'One-Piece Western WC', 'Wall-Hung WC', 'Floor-Mounted EWC', 'Indian Pan', 'Half-Pedestal Basin',
        'Pedestal Basin', 'Wall-Hung Basin', 'Countertop Basin', 'Urinal', 'Cistern', 'Kitchen Sink');
      create type scan_status as enum ('Pending', 'Approved', 'Rejected', 'Flagged');
      create type points_source as enum ('Product Scan', 'Invoice Incentive', 'Scheme Bonus', 'Redemption',
        'Redemption Reversal', 'Manual Adjustment', 'Opening Balance');
      create type related_entity as enum ('scan', 'invoice', 'redemption', 'scheme');
      create type invoice_status as enum ('Submitted', 'Under Review', 'Approved', 'Rejected', 'More Information Required');
      create type reward_category as enum ('Shopping Voucher', 'Gift Card', 'Air Conditioner', 'Refrigerator',
        'Television', 'Home Appliance', 'Tools & Equipment', 'Other');
      create type reward_type as enum ('Digital', 'Physical');
      create type redemption_status as enum ('Requested', 'Approved', 'Processing', 'Dispatched', 'Delivered', 'Cancelled', 'Failed');
      create type scheme_status as enum ('Draft', 'Scheduled', 'Active', 'Completed', 'Paused');
      create type scheme_target_type as enum ('Sales Amount', 'Approved Scans');
      create type ticket_status as enum ('Open', 'In Progress', 'Resolved', 'Closed');
      create type ticket_priority as enum ('Low', 'Medium', 'High');
      create type ticket_category as enum ('Points', 'Scan', 'Invoice', 'Redemption', 'Account', 'Product');
      create type audit_entity as enum ('Product', 'Plumber', 'Retailer', 'Scan', 'Invoice', 'Points', 'Reward',
        'Redemption', 'Scheme', 'Inventory', 'Support', 'Settings', 'Session', 'Label');
      create type product_unit_status as enum ('Available', 'Claimed', 'Void');
      create type upload_purpose as enum ('scan-photo', 'invoice-document', 'product-image');

      -- ----------------------------------------------------- readable identifiers
      create sequence plumber_seq start 1001;
      create sequence retailer_seq start 2001;
      create sequence product_seq start 101;
      create sequence scan_seq start 5001;
      create sequence invoice_seq start 3001;
      create sequence reward_seq start 6001;
      create sequence redemption_seq start 7001;
      create sequence scheme_seq start 401;
      create sequence inventory_seq start 1;
      create sequence ticket_seq start 8001;
      create sequence txn_seq start 90001;
      create sequence audit_seq start 100001;
      create sequence label_batch_seq start 1001;

      -- ------------------------------------------------------------- identity
      create table admins (
        id uuid primary key default gen_random_uuid(),
        name text not null check (length(trim(name)) >= 2),
        email text not null check (email = lower(email)),
        password_hash text not null,
        is_active boolean not null default true,
        password_changed_at timestamptz not null default now(),
        last_login_at timestamptz,
        created_at timestamptz not null default now()
      );
      create unique index admins_email_key on admins (email);

      create table refresh_tokens (
        id uuid primary key default gen_random_uuid(),
        subject_id text not null,
        role text not null check (role in ('admin', 'plumber', 'retailer', 'guest')),
        phone text,
        token_hash text not null,
        expires_at timestamptz not null,
        revoked_at timestamptz,
        replaced_by uuid,
        user_agent text,
        created_at timestamptz not null default now()
      );
      create unique index refresh_tokens_hash_key on refresh_tokens (token_hash);
      create index refresh_tokens_subject_idx on refresh_tokens (subject_id) where revoked_at is null;

      create table otp_challenges (
        id uuid primary key default gen_random_uuid(),
        phone text not null,
        code_hash text not null,
        expires_at timestamptz not null,
        attempts int not null default 0,
        consumed_at timestamptz,
        created_at timestamptz not null default now()
      );
      create index otp_challenges_phone_idx on otp_challenges (phone, created_at desc);

      -- --------------------------------------------------------------- network
      create table retailers (
        id text primary key default 'RTL-' || nextval('retailer_seq'),
        shop_name text not null check (length(trim(shop_name)) >= 3),
        owner_name text not null,
        mobile text not null,
        email text,
        address text not null,
        city text not null,
        state text not null,
        gstin text check (gstin is null or gstin ~ '^\\d{2}[A-Z]{5}\\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
        distributor text not null default '',
        registered_at timestamptz not null default now(),
        verification_status retailer_verification_status not null default 'Pending',
        account_status account_status not null default 'Active' check (account_status in ('Active', 'Suspended')),
        monthly_target bigint not null default 200000 check (monthly_target >= 0),
        rejection_reason text,
        last_login_at timestamptz
      );
      create unique index retailers_mobile_key on retailers (mobile);
      create index retailers_status_idx on retailers (verification_status, account_status);

      create table plumbers (
        id text primary key default 'PLM-' || nextval('plumber_seq'),
        name text not null check (length(trim(name)) >= 2),
        mobile text not null,
        email text,
        city text not null,
        state text not null,
        pincode text not null check (pincode ~ '^\\d{6}$'),
        registered_at timestamptz not null default now(),
        verification_status plumber_verification_status not null default 'Pending',
        account_status account_status not null default 'Active',
        aadhaar_masked text check (aadhaar_masked is null or aadhaar_masked ~ '^XXXX XXXX \\d{4}$'),
        experience_years int not null default 0 check (experience_years between 0 and 60),
        specialization text not null default '',
        preferred_retailer_id text references retailers (id) on delete set null,
        verification_note text,
        last_login_at timestamptz
      );
      create unique index plumbers_mobile_key on plumbers (mobile);
      create index plumbers_status_idx on plumbers (verification_status, account_status);

      -- -------------------------------------------------------------- catalogue
      create table products (
        id text primary key default 'PRD-' || nextval('product_seq'),
        name text not null,
        model_code text not null,
        category product_category not null,
        description text not null default '',
        dimensions text,
        features text[] not null default '{}',
        image_url text,
        sku text not null,
        barcode text not null check (barcode ~ '^\\d{8,14}$'),
        mrp bigint not null check (mrp > 0),
        plumber_points int not null default 0 check (plumber_points >= 0),
        is_active boolean not null default true,
        reward_eligible boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create unique index products_sku_key on products (lower(sku));
      create index products_barcode_idx on products (barcode);
      create index products_category_idx on products (category, is_active);

      -- -------------------------------------------------- QR labels (per unit)
      create table label_batches (
        id text primary key default 'LB-' || nextval('label_batch_seq'),
        product_id text not null references products (id),
        quantity int not null check (quantity between 1 and 10000),
        note text,
        created_by text not null,
        created_at timestamptz not null default now()
      );
      create index label_batches_product_idx on label_batches (product_id, created_at desc);

      create table product_units (
        serial text primary key,
        product_id text not null references products (id),
        batch_id text not null references label_batches (id),
        status product_unit_status not null default 'Available',
        claimed_scan_id text,
        claimed_at timestamptz,
        void_reason text,
        created_at timestamptz not null default now()
      );
      create index product_units_batch_idx on product_units (batch_id, serial);
      create index product_units_product_status_idx on product_units (product_id, status);

      -- ----------------------------------------------------------- points ledger
      create table points_ledger (
        id text primary key default 'TXN-' || nextval('txn_seq'),
        user_id text not null,
        user_role user_role not null,
        source points_source not null,
        related_type related_entity,
        related_id text,
        credit int not null default 0 check (credit >= 0),
        debit int not null default 0 check (debit >= 0),
        created_at timestamptz not null default now(),
        status text not null default 'Posted' check (status = 'Posted'),
        note text not null default '',
        created_by text not null,
        check ((credit > 0) <> (debit > 0)),
        check ((related_type is null) = (related_id is null))
      );
      create index points_ledger_user_idx on points_ledger (user_id, created_at desc);
      create index points_ledger_created_idx on points_ledger (created_at desc);
      create index points_ledger_related_idx on points_ledger (related_type, related_id);
      create unique index points_ledger_one_scan_credit on points_ledger (related_id) where source = 'Product Scan';
      create unique index points_ledger_one_invoice_credit on points_ledger (related_id) where source = 'Invoice Incentive';
      create unique index points_ledger_one_redemption_debit on points_ledger (related_id) where source = 'Redemption';
      create unique index points_ledger_one_redemption_refund on points_ledger (related_id) where source = 'Redemption Reversal';
      create unique index points_ledger_one_scheme_bonus on points_ledger (related_id, user_id) where source = 'Scheme Bonus';

      -- ------------------------------------------------------------------ uploads
      create table uploads (
        key text primary key,
        owner_id text not null,
        owner_role text not null,
        purpose upload_purpose not null,
        content_type text not null,
        size_bytes int not null check (size_bytes > 0),
        original_name text,
        created_at timestamptz not null default now()
      );
      create index uploads_owner_idx on uploads (owner_id, created_at desc);

      -- --------------------------------------------------------------------- scans
      create table scans (
        id text primary key default 'SCN-' || nextval('scan_seq'),
        plumber_id text not null references plumbers (id),
        product_id text not null references products (id),
        submitted_code text not null check (length(submitted_code) between 4 and 64),
        product_unit_serial text references product_units (serial),
        label_verified boolean not null default false,
        scanned_at timestamptz not null default now(),
        retailer_id text references retailers (id),
        invoice_number text,
        site_location text not null default '',
        photo_key text references uploads (key),
        status scan_status not null default 'Pending',
        awarded_points int,
        ledger_txn_id text references points_ledger (id),
        rejection_reason text,
        flag_reason text,
        reviewed_by text,
        reviewed_at timestamptz
      );
      create index scans_status_idx on scans (status, scanned_at desc);
      create index scans_plumber_idx on scans (plumber_id, scanned_at desc);
      create index scans_product_idx on scans (product_id, scanned_at desc);
      create index scans_code_idx on scans (submitted_code);
      create unique index scans_one_approved_serial on scans (submitted_code) where status = 'Approved';
      create unique index scans_one_open_serial on scans (submitted_code) where status in ('Pending', 'Flagged');

      -- ------------------------------------------------------------------ invoices
      create table invoices (
        id text primary key default 'INV-' || nextval('invoice_seq'),
        invoice_number text not null,
        retailer_id text not null references retailers (id),
        buyer_name text not null default '',
        invoice_date timestamptz not null,
        submitted_at timestamptz not null default now(),
        document_key text references uploads (key),
        status invoice_status not null default 'Submitted',
        reviewer text,
        reviewed_at timestamptz,
        incentive_points int,
        ledger_txn_id text references points_ledger (id),
        rejection_reason text,
        info_request text
      );
      create index invoices_status_idx on invoices (status, submitted_at desc);
      create index invoices_retailer_idx on invoices (retailer_id, invoice_date desc);
      create index invoices_number_idx on invoices (retailer_id, invoice_number);

      create table invoice_lines (
        id text primary key default gen_random_uuid()::text,
        invoice_id text not null references invoices (id) on delete cascade,
        product_id text not null references products (id),
        quantity int not null check (quantity > 0),
        unit_price bigint not null check (unit_price >= 0)
      );
      create index invoice_lines_invoice_idx on invoice_lines (invoice_id);
      create index invoice_lines_product_idx on invoice_lines (product_id);

      -- --------------------------------------------------------------- rewards
      create table rewards (
        id text primary key default 'RWD-' || nextval('reward_seq'),
        name text not null,
        category reward_category not null,
        type reward_type not null,
        description text not null default '',
        points_required int not null check (points_required > 0),
        stock int not null default 0 check (stock >= 0),
        is_active boolean not null default true,
        eligible_roles user_role[] not null default '{plumber,retailer}' check (cardinality(eligible_roles) > 0),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table redemptions (
        id text primary key default 'RDM-' || nextval('redemption_seq'),
        user_id text not null,
        user_role user_role not null,
        reward_id text not null references rewards (id),
        points_cost int not null check (points_cost > 0),
        requested_at timestamptz not null default now(),
        status redemption_status not null default 'Requested',
        delivery_address text not null default '',
        debit_txn_id text references points_ledger (id),
        reversal_txn_id text references points_ledger (id),
        fulfilment_ref text,
        voucher_code text,
        courier_name text,
        tracking_number text,
        cancel_reason text
      );
      create index redemptions_status_idx on redemptions (status, requested_at desc);
      create index redemptions_user_idx on redemptions (user_id, requested_at desc);
      create index redemptions_reward_idx on redemptions (reward_id);

      -- --------------------------------------------------------------- schemes
      create table schemes (
        id text primary key default 'SCH-' || nextval('scheme_seq'),
        name text not null check (length(trim(name)) >= 3),
        description text not null default '',
        role user_role not null,
        start_date timestamptz not null,
        end_date timestamptz not null,
        eligible_categories product_category[] not null check (cardinality(eligible_categories) > 0),
        target_type scheme_target_type not null,
        target_value bigint not null check (target_value > 0),
        incentive_points int not null check (incentive_points > 0),
        status scheme_status not null default 'Draft',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        check (end_date >= start_date),
        check ((role = 'retailer' and target_type = 'Sales Amount') or (role = 'plumber' and target_type = 'Approved Scans'))
      );
      create index schemes_live_idx on schemes (role, status, start_date, end_date);

      create table scheme_awards (
        scheme_id text not null references schemes (id),
        user_id text not null,
        awarded_at timestamptz not null default now(),
        ledger_txn_id text references points_ledger (id),
        primary key (scheme_id, user_id)
      );
      create index scheme_awards_user_idx on scheme_awards (user_id);

      -- ------------------------------------------------------------- inventory
      create table inventory (
        id text primary key default 'STK-' || nextval('inventory_seq'),
        retailer_id text not null references retailers (id),
        product_id text not null references products (id),
        quantity int not null check (quantity >= 0),
        updated_at timestamptz not null default now(),
        updated_by text not null default 'Retailer app',
        unique (retailer_id, product_id)
      );
      create index inventory_quantity_idx on inventory (quantity);

      -- --------------------------------------------------------------- support
      create table support_tickets (
        id text primary key default 'TKT-' || nextval('ticket_seq'),
        user_id text not null,
        user_role user_role not null,
        subject text not null check (length(trim(subject)) >= 3),
        category ticket_category not null,
        description text not null default '',
        priority ticket_priority not null default 'Medium',
        status ticket_status not null default 'Open',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create index support_tickets_status_idx on support_tickets (status, updated_at desc);
      create index support_tickets_user_idx on support_tickets (user_id);

      create table ticket_notes (
        id bigint generated always as identity primary key,
        ticket_id text not null references support_tickets (id) on delete cascade,
        at timestamptz not null default now(),
        by_name text not null,
        body text not null check (length(trim(body)) > 0)
      );
      create index ticket_notes_ticket_idx on ticket_notes (ticket_id, at);

      -- ------------------------------------------------- history / audit / settings
      create table status_events (
        id bigint generated always as identity primary key,
        entity_type related_entity not null,
        entity_id text not null,
        at timestamptz not null default now(),
        by_name text not null,
        action text not null,
        note text
      );
      create index status_events_entity_idx on status_events (entity_type, entity_id, at);

      create table audit_logs (
        id text primary key default 'AUD-' || nextval('audit_seq'),
        at timestamptz not null default now(),
        admin_name text not null,
        admin_id text,
        action text not null,
        entity_type audit_entity not null,
        entity_id text not null,
        summary text not null default ''
      );
      create index audit_logs_at_idx on audit_logs (at desc);
      create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

      create table settings (
        id boolean primary key default true check (id),
        programme_name text not null default 'Levik Rewards Programme',
        retailer_points_per_100 numeric(5, 2) not null default 1 check (retailer_points_per_100 between 0.1 and 20),
        low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
        notifications jsonb not null default '{"pendingScans": true, "pendingInvoices": true, "redemptions": true, "lowStock": true}',
        max_daily_scans_per_plumber int not null default 30 check (max_daily_scans_per_plumber > 0),
        updated_at timestamptz not null default now()
      );
      insert into settings default values;

      -- Search: trigram indexes for the global search and list filters.
      create extension if not exists pg_trgm;
      create index plumbers_search_idx on plumbers using gin ((name || ' ' || mobile || ' ' || city) gin_trgm_ops);
      create index retailers_search_idx on retailers using gin ((shop_name || ' ' || owner_name || ' ' || city || ' ' || coalesce(gstin, '')) gin_trgm_ops);
      create index products_search_idx on products using gin ((name || ' ' || model_code || ' ' || sku) gin_trgm_ops);

      -- ------------------------------------------------- integrity triggers
      create function fn_forbid_mutation() returns trigger language plpgsql as $$
      begin
        raise exception '% is append-only; % is not allowed', tg_table_name, tg_op;
      end;
      $$;
      create trigger points_ledger_append_only before update or delete on points_ledger
        for each row execute function fn_forbid_mutation();
      create trigger audit_logs_append_only before update or delete on audit_logs
        for each row execute function fn_forbid_mutation();
      create trigger status_events_append_only before update or delete on status_events
        for each row execute function fn_forbid_mutation();

      create function fn_assert_participant() returns trigger language plpgsql as $$
      begin
        if new.user_role = 'plumber' and not exists (select 1 from plumbers where id = new.user_id) then
          raise exception 'Unknown plumber %', new.user_id;
        elsif new.user_role = 'retailer' and not exists (select 1 from retailers where id = new.user_id) then
          raise exception 'Unknown retailer %', new.user_id;
        end if;
        return new;
      end;
      $$;
      create trigger points_ledger_participant before insert on points_ledger
        for each row execute function fn_assert_participant();
      create trigger redemptions_participant before insert or update of user_id, user_role on redemptions
        for each row execute function fn_assert_participant();
      create trigger support_tickets_participant before insert or update of user_id, user_role on support_tickets
        for each row execute function fn_assert_participant();

      create function fn_touch_updated_at() returns trigger language plpgsql as $$
      begin
        new.updated_at := now();
        return new;
      end;
      $$;
      create trigger products_touch before update on products for each row execute function fn_touch_updated_at();
      create trigger rewards_touch before update on rewards for each row execute function fn_touch_updated_at();
      create trigger schemes_touch before update on schemes for each row execute function fn_touch_updated_at();
      create trigger tickets_touch before update on support_tickets for each row execute function fn_touch_updated_at();
      create trigger settings_touch before update on settings for each row execute function fn_touch_updated_at();

      -- ---------------------------------------------------------- derived balances
      create view points_balances as
      select
        l.user_id,
        l.user_role,
        coalesce(sum(l.credit) filter (where l.source <> 'Redemption Reversal'), 0)::int as lifetime,
        (coalesce(sum(l.debit) filter (where l.source = 'Redemption'), 0)
          - coalesce(sum(l.credit) filter (where l.source = 'Redemption Reversal'), 0))::int as redeemed,
        (sum(l.credit) - sum(l.debit))::int as available
      from points_ledger l
      group by l.user_id, l.user_role;
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      drop view if exists points_balances;
      drop table if exists settings, audit_logs, status_events, ticket_notes, support_tickets, inventory,
        scheme_awards, schemes, redemptions, rewards, invoice_lines, invoices, scans, uploads, points_ledger,
        product_units, label_batches, products, plumbers, retailers, otp_challenges, refresh_tokens, admins cascade;
      drop function if exists fn_forbid_mutation, fn_assert_participant, fn_touch_updated_at;
      drop sequence if exists plumber_seq, retailer_seq, product_seq, scan_seq, invoice_seq, reward_seq,
        redemption_seq, scheme_seq, inventory_seq, ticket_seq, txn_seq, audit_seq, label_batch_seq;
      drop type if exists user_role, plumber_verification_status, account_status, retailer_verification_status,
        product_category, scan_status, points_source, related_entity, invoice_status, reward_category, reward_type,
        redemption_status, scheme_status, scheme_target_type, ticket_status, ticket_priority, ticket_category,
        audit_entity, product_unit_status, upload_purpose;
    `);
  }
}
