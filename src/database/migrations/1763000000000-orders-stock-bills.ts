import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retailer orders to Levik, an auditable stock ledger, customer bills, retailer confirmation of plumber
 * sales, and the extra retailer onboarding fields.
 *
 * Stock model: `inventory.quantity` is the current balance; every change appends a `stock_movements` row
 * with the delta and the balance after it (order delivered +, plumber sale −, customer bill −, manual
 * adjustment ±). Existing retailer-reported stock becomes an "Opening stock" movement so balances reconcile.
 */
export class OrdersStockBills1763000000000 implements MigrationInterface {
  name = 'OrdersStockBills1763000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`alter type upload_purpose add value if not exists 'gst-certificate'`);
    await q.query(`alter type points_source add value if not exists 'Retail Sale'`);
    await q.query(`alter type related_entity add value if not exists 'order'`);
    await q.query(`alter type related_entity add value if not exists 'bill'`);
    await q.query(`alter type audit_entity add value if not exists 'Order'`);
    await q.query(`alter type audit_entity add value if not exists 'Bill'`);

    // ------------------------------------------------------------ retailer onboarding
    await q.query(`
      alter table retailers
        add column pincode text check (pincode is null or pincode ~ '^[1-9][0-9]{5}$'),
        add column pan text check (pan is null or pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
        add column gst_certificate_key text references uploads (key) on delete set null,
        add column latitude double precision check (latitude is null or latitude between -90 and 90),
        add column longitude double precision check (longitude is null or longitude between -180 and 180)
    `);

    // ------------------------------------------------------------ orders (retailer → Levik)
    await q.query(`create type order_status as enum ('Placed', 'Confirmed', 'Dispatched', 'Delivered', 'Cancelled')`);
    await q.query(`create sequence order_seq start 1001`);
    await q.query(`create sequence purchase_invoice_seq start 1`);
    await q.query(`
      create table orders (
        id text primary key default 'ORD-' || nextval('order_seq'),
        retailer_id text not null references retailers (id),
        status order_status not null default 'Placed',
        note text,
        total_value bigint not null check (total_value >= 0),
        placed_at timestamptz not null default now(),
        confirmed_at timestamptz,
        dispatched_at timestamptz,
        delivered_at timestamptz,
        cancelled_at timestamptz,
        cancel_reason text,
        purchase_invoice_number text unique,
        updated_at timestamptz not null default now(),
        check ((status = 'Delivered') = (purchase_invoice_number is not null))
      )
    `);
    await q.query(`create index orders_retailer_idx on orders (retailer_id, placed_at desc)`);
    await q.query(`create index orders_status_idx on orders (status, placed_at desc)`);
    await q.query(`
      create table order_lines (
        id bigint generated always as identity primary key,
        order_id text not null references orders (id) on delete cascade,
        product_id text not null references products (id),
        quantity int not null check (quantity between 1 and 10000),
        unit_price bigint not null check (unit_price >= 0),
        unique (order_id, product_id)
      )
    `);

    // ------------------------------------------------------------ stock ledger
    await q.query(`create type stock_reason as enum ('Opening stock', 'Order delivered', 'Plumber sale', 'Customer bill', 'Manual adjustment')`);
    await q.query(`
      create table stock_movements (
        id bigint generated always as identity primary key,
        retailer_id text not null references retailers (id),
        product_id text not null references products (id),
        delta int not null check (delta <> 0),
        balance_after int not null check (balance_after >= 0),
        reason stock_reason not null,
        related_type text,
        related_id text,
        note text,
        created_at timestamptz not null default now(),
        created_by text not null,
        check ((related_type is null) = (related_id is null))
      )
    `);
    await q.query(`create index stock_movements_item_idx on stock_movements (retailer_id, product_id, created_at desc)`);
    await q.query(`
      insert into stock_movements (retailer_id, product_id, delta, balance_after, reason, note, created_by)
      select retailer_id, product_id, quantity, quantity, 'Opening stock', 'Stock reported before stock tracking', 'System'
        from inventory where quantity > 0
    `);

    // ------------------------------------------------------------ customer bills (retailer → buyer)
    await q.query(`create sequence bill_seq start 1`);
    await q.query(`
      create table customer_bills (
        id text primary key default 'BILL-' || nextval('bill_seq'),
        retailer_id text not null references retailers (id),
        bill_number text not null,
        customer_name text not null check (length(customer_name) between 2 and 120),
        customer_mobile text,
        scan_id text references scans (id),
        total_value bigint not null check (total_value >= 0),
        created_at timestamptz not null default now(),
        created_by text not null,
        unique (retailer_id, bill_number)
      )
    `);
    await q.query(`create unique index customer_bills_scan_idx on customer_bills (scan_id) where scan_id is not null`);
    await q.query(`create index customer_bills_retailer_idx on customer_bills (retailer_id, created_at desc)`);
    await q.query(`
      create table bill_lines (
        id bigint generated always as identity primary key,
        bill_id text not null references customer_bills (id) on delete cascade,
        product_id text not null references products (id),
        quantity int not null check (quantity between 1 and 10000),
        unit_price bigint not null check (unit_price >= 0),
        unique (bill_id, product_id)
      )
    `);

    // ------------------------------------------------------------ retailer confirms plumber sales
    await q.query(`
      alter table scans
        add column retailer_decision text check (retailer_decision in ('Confirmed', 'Declined')),
        add column retailer_decided_at timestamptz,
        add column retailer_note text,
        add column retailer_points int check (retailer_points is null or retailer_points >= 0),
        add column retailer_ledger_txn_id text
    `);
    await q.query(`create index scans_retailer_open_idx on scans (retailer_id, scanned_at desc) where retailer_decision is null`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`drop index if exists scans_retailer_open_idx`);
    await q.query(`alter table scans drop column retailer_ledger_txn_id, drop column retailer_points, drop column retailer_note, drop column retailer_decided_at, drop column retailer_decision`);
    await q.query(`drop table bill_lines`);
    await q.query(`drop table customer_bills`);
    await q.query(`drop sequence bill_seq`);
    await q.query(`drop table stock_movements`);
    await q.query(`drop type stock_reason`);
    await q.query(`drop table order_lines`);
    await q.query(`drop table orders`);
    await q.query(`drop sequence purchase_invoice_seq`);
    await q.query(`drop sequence order_seq`);
    await q.query(`drop type order_status`);
    await q.query(`alter table retailers drop column longitude, drop column latitude, drop column gst_certificate_key, drop column pan, drop column pincode`);
    // Postgres cannot drop enum values; the added upload purpose, points source and entity values remain.
  }
}
