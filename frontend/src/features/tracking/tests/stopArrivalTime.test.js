import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareStopArrivalTimes,
  formatStopArrivalTime,
  parseStopArrivalTime,
  serializeStopArrivalTime,
} from '../../../utils/stopArrivalTime.js';

test('parses LocalTime HH:mm and HH:mm:ss without Date conversion', () => {
  assert.equal(parseStopArrivalTime('08:20'), 30000);
  assert.equal(parseStopArrivalTime('08:20:15'), 30015);
  assert.equal(parseStopArrivalTime('24:00'), null);
});

test('formats LocalTime as 12-hour time and missing values as --', () => {
  assert.equal(formatStopArrivalTime('08:20:00'), '8:20 AM');
  assert.equal(formatStopArrivalTime('20:05'), '8:05 PM');
  assert.equal(formatStopArrivalTime(null), '--');
});

test('compares LocalTime values and serializes with seconds', () => {
  assert.equal(compareStopArrivalTimes('08:20', '08:20:00'), 0);
  assert.equal(compareStopArrivalTimes('08:19:59', '08:20'), -1);
  assert.equal(compareStopArrivalTimes('08:21', '08:20'), 1);
  assert.equal(serializeStopArrivalTime('08:20'), '08:20:00');
});
