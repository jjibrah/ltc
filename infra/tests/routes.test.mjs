import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const template=JSON.parse(readFileSync('cdk.out/LtcMigration.template.json','utf8'));
const resource=Object.values(template.Resources).find(value=>value.Type==='AWS::CloudFront::Function');
assert.ok(resource,'Missing CloudFront route function');
const rewrite=(uri)=>runInNewContext(`${resource.Properties.FunctionCode};handler(event)`,{event:{request:{uri}}}).uri;
test('public/admin/recovery deep links and React catchall survive static delivery',()=>{
    for(const uri of ['/','/about','/mission','/stories','/team','/donate','/mentor','/donation-success','/login','/forgot-password','/set-password/uid/header.payload.signature','/unsubscribe/token','/profile/submit/token','/admin/users/fixture','/unknown-route'])
        assert.equal(rewrite(uri),'/index.html',uri);
});
test('missing static assets never become successful HTML responses',()=>{
    for(const uri of ['/assets/missing.js','/assets/missing','/images/missing.jpg','/images/missing','/favicon.svg','/robots.txt','/api/missing','/api/donations/progress/'])assert.equal(rewrite(uri),uri,uri);
});
test('staging and production require an explicit environment choice',()=>{
    assert.equal(template.Parameters.ApplicationEnvironment.Default,'staging');
    assert.deepEqual(template.Parameters.ApplicationEnvironment.AllowedValues,['staging','production']);
});
