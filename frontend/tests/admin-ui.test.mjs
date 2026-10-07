import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Pre-redesign complete request expressions and action permission checks.
const baseline = {
  "newsletters/NewslettersSection.jsx": {
    "transport": "161b7d9c173a67d3c2838d81bc3ba742643091997e020e458108f1f44ffc8c4b",
    "permissions": [
      "can('newsletters.create')",
      "can('newsletters.delete')",
      "can('newsletters.send')",
      "can('newsletters.update')"
    ]
  },
  "newsletters/PreviewModal.jsx": {
    "transport": "9d1bbe3c26a825003b8f1b27e37faa86f327d4759ad5458f0f8d2f3f1afd8a0b",
    "permissions": []
  },
  "users/UsersPage.jsx": {
    "transport": "559f9f2001f2b71929c0abf78ddaa36f72d046c56a89666e541dcaf51ed9bf79",
    "permissions": []
  },
  "users/UserDetailPage.jsx": {
    "transport": "f4d81e3afce39fd40796b803e28e5f8951f8d140e78caa5ff149f5ba3eceaf12",
    "permissions": []
  },
  "profiles/ProfilesPage.jsx": {
    "transport": "79640a6656101c1fa6148378978f7f76551f552cc4f4acb097a92f5f7bfbfa25",
    "permissions": [
      "can('profiles.update')",
      "can('profiles.update')"
    ]
  },
  "profiles/ProfileReviewPage.jsx": {
    "transport": "552525411818f8111eccee7ee515481e3fa5e80eb275b940c1f9b9e7c7a4af39",
    "permissions": [
      "can('profiles.update')"
    ]
  },
  "donations/DonationsPage.jsx": {
    "transport": "6031c3babab5461edec10fdaf8f43fe29a899199a4093bbd9d9307da25c2ca98",
    "permissions": [
      "can('pledges.view')"
    ]
  },
  "mentors/MentorsPage.jsx": {
    "transport": "364d6bf16748c203f1fc92fdb96b0979021521bf908daa93fe8bc9461d2c9947",
    "permissions": [
      "can('mentors.update')"
    ]
  },
  "stories/StoriesPage.jsx": {
    "transport": "a9418bc204ae32b10a003a92c80270a8bb863c3521107b331be4fd67435a2ec0",
    "permissions": [
      "can('stories.create')",
      "can('stories.delete')",
      "can('stories.publish')",
      "can('stories.publish')",
      "can('stories.publish')",
      "can('stories.publish')",
      "can('stories.update')",
      "can('stories.update')"
    ]
  },
  "profile/AdminProfilePage.jsx": {
    "transport": "94a274fa5a61130633bfa8e1f9c93871ed0024162afdaf4f79c477ca1c09f4e5",
    "permissions": [
      "can('profiles.view')"
    ]
  },
  "first-login/FirstLoginPasswordPage.jsx": {
    "transport": "5357afc04e99aa13637e03142c0086be4d08d93c31064d9dd911ebcf98628928",
    "permissions": []
  },
  "audit/AuditLogPage.jsx": {
    "transport": "2a20118992827407cb53a4535666efdbf0c22a0707face06333d43ed74660de1",
    "permissions": []
  },
  "dashboard/AdminDashboardPage.jsx": {
    "transport": "40eceac7f9fcbdb2cbbe52a3fd90ce0285ca5b872902968f44c6ffaada5be718",
    // Owner-authorized dashboard shortcuts now also check their destination permissions.
    "permissions": [
      "can('audit.view')", "can('donations.view')", "can('mentors.view')", "can('newsletters.view')", "can('stories.view')", "can('users.invite')", "can('users.manage_permissions')"
    ]
  }
};

function calls(source) {
 const matcher=/\b(?:apiRequest|(?:usersService|teamProfilesService|profileSubmissionLinksService|storiesService|adminDataProvider|authService|auditService|dashboardService)\.[A-Za-z]+|getAdminDonations|getAdminPledges|getDonationSummary|createManualDonation|updatePledgeStatus|updateSupporterPublication)\s*\(/g;
 const result=[];let match;
 while((match=matcher.exec(source))){let depth=1,quote='',escape=false,end=matcher.lastIndex;for(;end<source.length;end++){const c=source[end];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='\x60'){quote=c;continue;}if(c==='(')depth++;if(c===')'&&!--depth){end++;break;}}result.push(source.slice(match.index,end).replace(/\s+/g,' ').trim());matcher.lastIndex=end;}return result.sort();
}

for (const [file, expected] of Object.entries(baseline)) {
 test(file + ': request expressions and permission checks preserve the baseline', () => {
  const source = readFileSync(new URL('../src/admin/' + file, import.meta.url), 'utf8');
  assert.equal(createHash('sha256').update(JSON.stringify(calls(source))).digest('hex'), expected.transport);
  assert.deepEqual([...source.matchAll(/\bcan\('[^']+'\)/g)].map(m => m[0]).sort(), expected.permissions);
 });
}
