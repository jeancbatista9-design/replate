import test from 'node:test';
import assert from 'node:assert/strict';
import {javiAnswer,javiReview} from '../public/js/javi.js';
const state={user:{name:'Alex'},profiles:[],items:[{id:1,name:'Spinach',status:'active',expiry:'2020-01-01',storage:'fridge'}],shopping:[],recipes:[{name:'Spinach Pasta',minutes:20,used:[1],missing:[],warnings:[]},{name:'Unsafe Match',minutes:10,used:[1],missing:[],warnings:['milk allergy']}]};
test('Javi recommends meals using inventory and filters recorded conflicts',()=>{const a=javiAnswer('What can I cook?',state);assert.match(a.text,/Spinach Pasta/);assert.doesNotMatch(a.text,/Unsafe Match/);assert.equal(a.action,'meals');});
test('Javi does not claim inventory dates establish food safety',()=>{assert.match(javiAnswer('What expires first?',state).text,/dates don’t establish safety/);});
test('Javi does not invent a nutrition rating when data is absent',()=>{assert.match(javiReview({product_name:'Unknown'},state),/Think Twice/);assert.match(javiReview({product_name:'Unknown'},state),/incomplete or conflicting/);});
