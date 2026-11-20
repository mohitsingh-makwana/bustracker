import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPatternStopRequests, validatePatternStopTimes } from '../../../utils/stopArrivalTime.js';

const stop = (name, time) => ({ stopName: name, stopArrivalTime: time });

test('flags a stop whose time moves backwards', () => {
  const errors = validatePatternStopTimes([stop('A', '08:20'), stop('B', '08:19')]);
  assert.equal(errors[1], 'Must not be earlier than the previous stop (8:20 AM)');
});

test('requires a time on every stop', () => {
  assert.equal(validatePatternStopTimes([stop('A', ''), stop('B', '08:30')])[0], 'Arrival time is required.');
});

test('re-validates against the new order after a reorder', () => {
  const original = [stop('A', '08:20'), stop('B', '08:40'), stop('C', '09:00')];
  assert.deepEqual(validatePatternStopTimes(original), ['', '', '']);
  const reordered = [original[2], original[0], original[1]];
  assert.equal(validatePatternStopTimes(reordered)[1], 'Must not be earlier than the previous stop (9:00 AM)');
});

test('assigns sequence from the current selected order for create and update payloads', () => {
  const selected = [
    { stopId: '30', stopArrivalTime: '08:20' },
    { stopId: '10', stopArrivalTime: '08:45:00' },
    { stopId: '20', stopArrivalTime: '09:10' },
  ];
  assert.deepEqual(buildPatternStopRequests(selected), [
    { stopId: 30, sequence: 1, stopArrivalTime: '08:20:00' },
    { stopId: 10, sequence: 2, stopArrivalTime: '08:45:00' },
    { stopId: 20, sequence: 3, stopArrivalTime: '09:10:00' },
  ]);

  const reordered = [selected[2], selected[0], selected[1]];
  assert.deepEqual(buildPatternStopRequests(reordered).map(({ stopId, sequence }) => ({ stopId, sequence })), [
    { stopId: 20, sequence: 1 },
    { stopId: 30, sequence: 2 },
    { stopId: 10, sequence: 3 },
  ]);
});
