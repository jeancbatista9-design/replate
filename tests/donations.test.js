import test from 'node:test';
import assert from 'node:assert/strict';
import {donationCandidates,foodbanks} from '../public/js/donations.js';
import {date} from '../public/js/ui.js';
test('donation suggestions prioritize upcoming dates and exclude inactive and past-date food',()=>{const items=[{id:1,status:'active',expiry:date(6)},{id:2,status:'active',expiry:date(1)},{id:3,status:'active',expiry:date(-1)},{id:4,status:'donated',expiry:date(2)},{id:5,status:'active',expiry:date(9)}];assert.deepEqual(donationCandidates({items}).map(i=>i.id),[2,1]);});
test('partner page clearly identifies demo partners and does not claim confirmed deliveries',()=>{const html=foodbanks({items:[]});assert.match(html,/Demo Partner/);assert.match(html,/No real partnerships or drop-offs are confirmed/);});
