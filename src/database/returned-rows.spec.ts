import { returnedRows } from './returned-rows.js';

describe('returnedRows', () => {
  it('unwraps the [rows, rowCount] pair TypeORM returns for UPDATE/DELETE … RETURNING', () => {
    expect(returnedRows<{ id: string }>([[{ id: 'SCH-1' }, { id: 'SCH-2' }], 2])).toEqual([{ id: 'SCH-1' }, { id: 'SCH-2' }]);
    expect(returnedRows([[], 0])).toEqual([]);
  });

  it('passes plain rows through (SELECT, INSERT … RETURNING)', () => {
    expect(returnedRows<{ id: string }>([{ id: 'A' }, { id: 'B' }])).toEqual([{ id: 'A' }, { id: 'B' }]);
    expect(returnedRows([])).toEqual([]);
  });
});
