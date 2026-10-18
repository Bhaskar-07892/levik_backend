import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { buildDataSourceOptions } from '../src/database/data-source-options.js';
import { DEMO_PASSWORD, seedDemoData } from '../src/database/seeds/seed.js';
import { setupApp } from '../src/setup-app.js';

/**
 * Full-stack tests: real AppModule + HTTP pipeline against a disposable Postgres database
 * (levik_test, migrated and reseeded before the run). Mirrors the client demo scenarios.
 */
describe('Levik API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let admin: string;
  const api = (path: string) => `/api/v1${path}`;

  beforeAll(async () => {
    const ds = new DataSource(
      buildDataSourceOptions({ url: process.env.DATABASE_URL!, ssl: false, logging: false, runMigrations: false, poolSize: 2 }),
    );
    await ds.initialize();
    await ds.runMigrations();
    await seedDemoData(ds, { reset: true });
    await ds.destroy();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    http = request(app.getHttpServer());

    const login = await http.post(api('/auth/admin/login')).send({ email: 'admin@levik.demo', password: DEMO_PASSWORD });
    expect(login.status).toBe(200);
    admin = `Bearer ${login.body.accessToken}`;
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  const balance = async (userId: string) =>
    (await http.get(api(`/admin/points/balances/${userId}`)).set('authorization', admin)).body.available as number;

  describe('auth', () => {
    it('rejects bad credentials with the error envelope', async () => {
      const res = await http.post(api('/auth/admin/login')).send({ email: 'admin@levik.demo', password: 'wrong-password' });
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ statusCode: 401, code: expect.any(String), path: api('/auth/admin/login') });
    });

    it('requires a token on admin routes and validates input', async () => {
      expect((await http.get(api('/admin/dashboard'))).status).toBe(401);
      const res = await http.post(api('/auth/admin/login')).send({ email: 'not-an-email', password: 'x', extra: true });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('rotates refresh tokens and detects reuse', async () => {
      const login = await http.post(api('/auth/admin/login')).send({ email: 'admin@levik.demo', password: DEMO_PASSWORD });
      const first = login.body.refreshToken;
      const rotated = await http.post(api('/auth/refresh')).send({ refreshToken: first });
      expect(rotated.status).toBe(200);
      expect(rotated.body.refreshToken).not.toBe(first);
      const reused = await http.post(api('/auth/refresh')).send({ refreshToken: first });
      expect(reused.status).toBe(401);
      // Reuse revokes the whole family, including the rotated token.
      expect((await http.post(api('/auth/refresh')).send({ refreshToken: rotated.body.refreshToken })).status).toBe(401);
    });
  });

  describe('scenario A: scan approval', () => {
    it('credits scan points and the scheme bonus exactly once', async () => {
      expect(await balance('PLM-1001')).toBe(4080);
      const res = await http.post(api('/admin/scans/SCN-5007/approve')).set('authorization', admin).send({});
      expect(res.status).toBe(200);
      expect(res.body.points).toBe(350);
      expect(res.body.schemeAwards).toEqual([expect.objectContaining({ id: 'SCH-402', incentivePoints: 1000 })]);
      expect(await balance('PLM-1001')).toBe(5430);

      const again = await http.post(api('/admin/scans/SCN-5007/approve')).set('authorization', admin).send({});
      expect(again.status).toBe(409);
      expect(await balance('PLM-1001')).toBe(5430);
    });

    it('blocks approval of an already credited serial', async () => {
      const res = await http.post(api('/admin/scans/SCN-5015/approve')).set('authorization', admin).send({});
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('CHECKS_FAILED');
      const reject = await http
        .post(api('/admin/scans/SCN-5015/reject'))
        .set('authorization', admin)
        .send({ reason: 'Serial already credited on SCN-5003' });
      expect(reject.status).toBe(200);
    });
  });

  describe('scenario B: invoice approval', () => {
    it('credits the incentive and retail scheme bonus', async () => {
      const before = await balance('RTL-2001');
      const res = await http.post(api('/admin/invoices/INV-3009/approve')).set('authorization', admin).send({});
      expect(res.status).toBe(200);
      expect(res.body.points).toBe(711);
      expect(res.body.schemeAwards[0]).toMatchObject({ id: 'SCH-401', incentivePoints: 5000 });
      expect(await balance('RTL-2001')).toBe(before + 711 + 5000);
    });

    it('blocks a duplicate invoice number', async () => {
      const res = await http.post(api('/admin/invoices/INV-3010/approve')).set('authorization', admin).send({});
      expect(res.status).toBe(422);
    });
  });

  describe('scenario C: redemption', () => {
    it('debits once on approval and never again on later transitions', async () => {
      expect(await balance('PLM-1004')).toBe(5420);
      const approve = await http.post(api('/admin/redemptions/RDM-7004/approve')).set('authorization', admin).send({});
      expect(approve.status).toBe(200);
      expect(approve.body.reward.stock).toBe(11);
      for (const status of ['Processing', 'Dispatched']) {
        const res = await http
          .post(api('/admin/redemptions/RDM-7004/status'))
          .set('authorization', admin)
          .send({ status, courierName: 'Blue Dart', trackingNumber: 'BD123456' });
        expect(res.status).toBe(200);
      }
      expect(await balance('PLM-1004')).toBe(2920);
    });

    it('blocks a redemption the balance cannot cover', async () => {
      const res = await http.post(api('/admin/redemptions/RDM-7006/approve')).set('authorization', admin).send({});
      expect(res.status).toBe(422);
    });

    it('serialises concurrent approvals so points are debited once', async () => {
      const id = 'RDM-7005';
      const results = await Promise.all(
        Array.from({ length: 5 }, () => http.post(api(`/admin/redemptions/${id}/approve`)).set('authorization', admin).send({})),
      );
      const ok = results.filter((r) => r.status === 200);
      expect(ok.length).toBeLessThanOrEqual(1);
      const ledger = await http.get(api('/admin/points/ledger')).query({ search: id, pageSize: 50 }).set('authorization', admin);
      const debits = ledger.body.items.filter((t: { referenceId?: string; type: string }) => t.referenceId === id && t.type === 'Debit');
      expect(debits.length).toBe(ok.length);
    });
  });

  describe('QR labels and the mobile scan flow', () => {
    let payload: string;
    let plumber: string;

    it('generates a label batch with PDF and CSV exports', async () => {
      const batch = await http
        .post(api('/admin/products/PRD-103/label-batches'))
        .set('authorization', admin)
        .send({ quantity: 10, note: 'e2e' });
      expect(batch.status).toBe(201);
      expect(batch.body).toMatchObject({ productId: 'PRD-103', quantity: 10, available: 10 });

      const pdf = await http.get(api(`/admin/label-batches/${batch.body.id}/labels.pdf`)).set('authorization', admin).buffer();
      expect(pdf.status).toBe(200);
      expect(pdf.headers['content-type']).toContain('application/pdf');

      const csv = await http.get(api(`/admin/label-batches/${batch.body.id}/labels.csv`)).set('authorization', admin);
      const rows = csv.text.trim().split('\n');
      expect(rows).toHaveLength(11);
      payload = rows[1].split(',').at(-1)!;
      expect(payload).toMatch(/^https:\/\/levik\.in\/v\/LVK-/);
    });

    it('verifies genuine labels publicly and rejects tampered ones', async () => {
      const genuine = await http.get(api('/public/labels/verify')).query({ code: payload });
      expect(genuine.body).toMatchObject({ genuine: true, status: 'Available' });
      const forged = await http.get(api('/public/labels/verify')).query({ code: `${payload.slice(0, -2)}zz` });
      expect(forged.body.genuine).toBe(false);
    });

    it('signs a plumber in with OTP and submits a scan once', async () => {
      expect((await http.post(api('/auth/otp/request')).send({ phone: '9829011234' })).status).toBe(200);
      const verify = await http.post(api('/auth/otp/verify')).send({ phone: '9829011234', code: '123456' });
      expect(verify.body.user).toMatchObject({ id: 'PLM-1001', role: 'plumber' });
      plumber = `Bearer ${verify.body.accessToken}`;

      const resolved = await http.get(api('/app/labels/resolve')).query({ code: payload }).set('authorization', plumber);
      expect(resolved.body).toMatchObject({ signatureValid: true, status: 'Available', productId: 'PRD-103' });

      const scan = await http.post(api('/app/scans')).set('authorization', plumber).send({ code: payload, retailerId: 'RTL-2001' });
      expect(scan.status).toBe(201);
      expect(scan.body).toMatchObject({ status: 'Pending', points: 350 });

      const dup = await http.post(api('/app/scans')).set('authorization', plumber).send({ code: payload, retailerId: 'RTL-2001' });
      expect(dup.status).toBe(422);

      // Approving the new scan claims the unit.
      const approve = await http.post(api(`/admin/scans/${scan.body.id}/approve`)).set('authorization', admin).send({});
      expect(approve.status).toBe(200);
      const verifyAfter = await http.get(api('/public/labels/verify')).query({ code: payload });
      expect(verifyAfter.body.status).toBe('Claimed');
    });

    it('keeps plumbers out of admin routes', async () => {
      expect((await http.get(api('/admin/dashboard')).set('authorization', plumber)).status).toBe(403);
    });

    it('registers a new plumber through the guest flow', async () => {
      await http.post(api('/auth/otp/request')).send({ phone: '9900011122' });
      const guest = await http.post(api('/auth/otp/verify')).send({ phone: '9900011122', code: '123456' });
      expect(guest.body.user.role).toBe('guest');
      const guestToken = `Bearer ${guest.body.accessToken}`;
      expect((await http.get(api('/app/wallet')).set('authorization', guestToken)).status).toBe(403);

      const reg = await http
        .post(api('/app/plumbers/register'))
        .set('authorization', guestToken)
        .send({ name: 'Test Fitter', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' });
      expect(reg.status).toBe(201);
      expect(reg.body.user).toMatchObject({ role: 'plumber', name: 'Test Fitter' });
    });
  });

  describe('admin read models', () => {
    it.each([
      '/admin/dashboard?period=30d',
      '/admin/plumbers?pageSize=5',
      '/admin/retailers?sort=achievementPct',
      '/admin/products',
      '/admin/schemes',
      '/admin/points/ledger/totals',
      '/admin/audit-logs?pageSize=5',
      '/admin/notifications',
      '/admin/search?q=ram',
      '/admin/reports/top-products?period=90d',
    ])('GET %s', async (path) => {
      const res = await http.get(api(path)).set('authorization', admin);
      expect(res.status).toBe(200);
    });

    it('exports reports as CSV', async () => {
      const res = await http.get(api('/admin/reports/points?period=all&format=csv')).set('authorization', admin);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });
  });
});
