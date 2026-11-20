import test from 'node:test';
import assert from 'node:assert/strict';
import { createThrottle, interpolatePoint, isLocationStale } from '../services/liveLocationService.js';
import { haversineMeters, headingWedgeStyle } from '../../../components/maps/geoUtils.js';

test('throttle only emits at configured interval',()=>{const sent=[];const send=createThrottle(5000,v=>sent.push(v));assert.equal(send('a',10000),true);assert.equal(send('b',12000),false);assert.equal(send('c',15000),true);assert.deepEqual(sent,['a','c']);});
test('linear interpolation stays between GPS readings',()=>{assert.deepEqual(interpolatePoint({lat:0,lng:0},{lat:10,lng:20},.5),{lat:5,lng:10});});
test('staleness respects server stale flag and updatedAt',()=>{assert.equal(isLocationStale({stale:true,updatedAt:new Date().toISOString()}),true);assert.equal(isLocationStale({updatedAt:new Date(0).toISOString()},60000),true);assert.equal(isLocationStale({updatedAt:new Date(59000).toISOString()},60000),false);});
test('haversine flags nearby stop within 50m',()=>{assert.ok(haversineMeters({lat:22.7196,lng:75.8577},{lat:22.7197,lng:75.8577})<50);assert.ok(haversineMeters({lat:22.7196,lng:75.8577},{lat:22.73,lng:75.8577})>50);});

test('heading wedge hides when heading is missing and rotates when present',()=>{assert.equal(headingWedgeStyle(null),null);assert.deepEqual(headingWedgeStyle(90),{transform:'rotate(90deg)'});});
