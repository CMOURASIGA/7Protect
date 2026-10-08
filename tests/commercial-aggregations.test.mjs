import test from 'node:test';
import assert from 'node:assert/strict';
import { commercialDateParts, aggregateCommercialActivities } from '../application/commercial-aggregations.ts';
const activity = (contactId, type, extra = {}) => ({ contactId, type, tenantId: 'tenant', status: 'completed', completedAt: '2026-12-31T15:00:00Z', ...extra });
test('calendar year and ISO week year remain separate at year boundaries', () => {
  assert.deepEqual(commercialDateParts('2021-01-01T15:00:00Z'), { week: 53, weekYear: 2020, month: 1, year: 2021, period: '2021-01' });
  assert.equal(commercialDateParts('2026-01-01T01:00:00Z').period, '2025-12');
  assert.equal(commercialDateParts('invalid'), null);
});
test('aggregation derives dates by status and excludes deleted activities', () => {
  const result = aggregateCommercialActivities([activity('a','ab_phone'), activity('b','proposal', { status: 'planned', scheduledAt: '2027-01-02T15:00:00Z' }), activity('c','proposal', { deletedAt: '2026-12-31' })]);
  assert.equal(result.total, 2);
  assert.equal(result.byYear['2026'].length, 1);
  assert.equal(result.byMonth['2027-01'].length, 1);
  assert.equal(result.byWeek['2026-W53'].length, 2);
});
test('conversion uses distinct contacts with both completed stages', () => {
  const result = aggregateCommercialActivities([activity('a','ab_phone'), activity('a','ab_phone'), activity('b','ab_phone'), activity('a','approach_completed'), activity('c','approach_completed'), activity('b','approach_completed', { status: 'planned' })], [{ id:'a', tenantId:'tenant', origin:'Evento', consultant:'Consultor' }]);
  assert.deepEqual(result.conversions[0], { from:'ab_phone', to:'approach_completed', base:2, converted:1, percentage:50 });
  assert.equal(result.byOrigin.Evento, 3);
  assert.equal(result.byConsultant.Consultor, 3);
  assert.equal(aggregateCommercialActivities([]).conversions[0].percentage, null);
});
