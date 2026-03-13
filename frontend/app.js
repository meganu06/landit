// ── PDF.JS WORKER ─────────────────────────────────────────────────────
if (typeof pdfjsLib !== 'undefined') {
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// ── SUPABASE INIT ─────────────────────────────────────────────────────
const sb = window.supabase.createClient(
'https://wbcgymgqqrhwgshkdfcx.supabase.co',
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY2d5bWdxcXJod2dzaGtkZmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzU5NTQsImV4cCI6MjA4MDg1MTk1NH0.js40qIOVH_PPaHyzo0AjTuiVsPxRy9PAaHkTtcR_P1A'
);

let currentUser = null;
let userSkills = []; // [{skill_name, proficiency_level, id, skills:{name}}]
let allPlacements = []; // placements with companies + placement_skills
let matchScores = {}; // placement_id → score
let pendingRole = 'student'; // set when user picks a role on landing

function selectRole(role) {
pendingRole = role;
const isStaff = role === 'admin';
document.getElementById('signup-form-title').textContent = isStaff ? 'Create Staff Account' : 'Create Account';
document.getElementById('signup-step2-student-fields').style.display = isStaff ? 'none' : 'block';
openModal('signup');
}

// ── AUTH STATE ────────────────────────────────────────────────────────
sb.auth.onAuthStateChange((event, session) => {
if (session?.user) {
currentUser = session.user;
showDashboard();
} else {
currentUser = null;
showLanding();
}
});

window.addEventListener('load', async () => {
const { data: { session } } = await sb.auth.getSession();
if (session?.user) {
currentUser = session.user;
showDashboard();
}
});

// ── UI STATE ──────────────────────────────────────────────────────────
function showLanding() {
document.getElementById('landing').style.display = 'flex';
document.getElementById('dashboard').style.display = 'none';
document.getElementById('staff-portal').style.display = 'none';
}

async function showDashboard() {
closeModal();
const { data: profile } = await sb.from('users').select('role, first_name, last_name').eq('id', currentUser.id).maybeSingle();
const role = profile?.role || 'student';
const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || currentUser.email.split('@')[0];

document.getElementById('landing').style.display = 'none';

if (role === 'admin') {
document.getElementById('dashboard').style.display = 'none';
document.getElementById('staff-portal').style.display = 'block';
document.getElementById('staff-navbar-welcome').textContent = `Welcome, ${name}`;
loadStaffData();
} else {
document.getElementById('staff-portal').style.display = 'none';
document.getElementById('dashboard').style.display = 'block';
document.getElementById('navbar-welcome').textContent = `Welcome, ${name}`;
loadDashboard();
}
}

// ── TAB SWITCHING ─────────────────────────────────────────────────────
function switchTab(tab) {
document.querySelectorAll('#dashboard .tab-panel').forEach(p => p.classList.remove('active'));
document.querySelectorAll('#dashboard .tab-btn').forEach(b => b.classList.remove('active'));
document.getElementById(`tab-${tab}`).classList.add('active');
event.target.classList.add('active');
}

function switchStaffTab(tab, btn) {
document.querySelectorAll('#staff-portal .tab-panel').forEach(p => p.classList.remove('active'));
document.querySelectorAll('#staff-portal .tab-btn').forEach(b => b.classList.remove('active'));
document.getElementById(`staff-tab-${tab}`).classList.add('active');
btn.classList.add('active');
}

// ── LOAD DASHBOARD DATA ───────────────────────────────────────────────
async function loadDashboard() {
await Promise.all([loadSkills(), loadPlacements(), loadCV(), loadProfile()]);
runMatching();
loadBookmarks();
}

async function loadSkills() {
const { data, error } = await sb
.from('student_skills')
.select('*, skills(name, category)')
.eq('user_id', currentUser.id);

if (error) { console.error('Skills error:', error); return; }
userSkills = data || [];
renderSkills();
document.getElementById('stat-skills-count').textContent = userSkills.length;
}

async function loadPlacements() {
const { data, error } = await sb
.from('placements')
.select(`
*,
companies (name, industry, website_url),
placement_skills (
importance,
skills (name, category)
)
`)
.eq('is_active', true)
.order('created_at', { ascending: false });

if (error) { console.error('Placements error:', error); return; }
allPlacements = data || [];
document.getElementById('stat-total-placements').textContent = allPlacements.length;
document.getElementById('placements-count').textContent = `${allPlacements.length} open roles`;
}

async function loadCV() {
const { data } = await sb
.from('cv')
.select('*')
.eq('user_id', currentUser.id)
.order('uploaded_at', { ascending: false })
.limit(1)
.maybeSingle();

const container = document.getElementById('cv-current');
if (data) {
const date = new Date(data.uploaded_at).toLocaleDateString();
const fileName = data.file_url.split('/').pop().split('?')[0];
container.innerHTML = `
<div class="cv-current">
<div class="cv-icon">📄</div>
<div class="cv-info">
<div class="cv-name">${fileName}</div>
<div class="cv-meta">Uploaded ${date}</div>
</div>
<a href="${data.file_url}" target="_blank" class="btn btn-secondary btn-sm">View</a>
<button class="btn btn-danger btn-sm" onclick="deleteCV('${data.id}', '${data.file_url}')">Delete</button>
</div>`;
} else {
container.innerHTML = '<p style="color:#9ca3af;font-size:0.875rem;margin-bottom:1rem;">No CV uploaded yet.</p>';
}
}

async function deleteCV(cvId, fileUrl) {
if (!confirm('Delete your CV? This will also remove all skills extracted from it.')) return;

const urlPath = fileUrl.split('/storage/v1/object/public/cvs/')[1];
if (urlPath) {
await sb.storage.from('cvs').remove([decodeURIComponent(urlPath)]);
}

const { error } = await sb.from('cv').delete().eq('id', cvId);
if (error) { alert('Failed to delete CV: ' + error.message); return; }

await sb.from('student_skills')
.delete()
.eq('user_id', currentUser.id)
.eq('source', 'cv');

loadCV();
loadSkills();
runMatching();
}

async function loadBookmarks() {
const { data, error } = await sb
.from('bookmarks')
.select(`*, placements(*, companies(name, industry))`)
.eq('user_id', currentUser.id)
.order('created_at', { ascending: false });

const list = document.getElementById('bookmarks-list');
const countEl = document.getElementById('stat-bookmarks-count');

if (error) {
list.innerHTML = `<div class="empty-state"><div class="icon">🔖</div><p>Bookmarks not set up yet.</p></div>`;
countEl.textContent = '0';
return;
}

countEl.textContent = (data || []).length;

if (!data || data.length === 0) {
list.innerHTML = `<div class="empty-state"><div class="icon">🔖</div><p>No saved placements yet. Bookmark roles from the Placements tab.</p></div>`;
return;
}

list.innerHTML = data.map(b => renderPlacementCard(b.placements, { bookmarked: true, inBookmarksTab: true })).join('');
}

// ── MATCHING ALGORITHM ────────────────────────────────────────────────
// Tuning constants — adjust these to change how scores feel:
// REQ_CURVE_POWER lower = more generous (0.3 very lenient, 1.0 strict linear)
// REQ_WEIGHT % of score from required skills (+ PREF_WEIGHT must = 100)
// PREF_WEIGHT % of score from preferred skills
// FLOOR_BOOST bonus when student matches at least 1 required skill
// BASE_BOOST flat bonus added to every non-zero score
// LOW_CAP_MAX max score when required coverage is very low (< 20%)
const REQ_CURVE_POWER = 0.65;
const REQ_WEIGHT = 75;
const PREF_WEIGHT = 25;
const FLOOR_BOOST = 8;
const BASE_BOOST = 5;
const LOW_CAP_MAX = 35;

function calculateScore(placement) {
const userSkillNames = userSkills.map(s => (s.skills?.name || s.skill_name || '').toLowerCase());
const placementSkills = placement.placement_skills || [];

if (!placementSkills.length) return { score: 0, matched: [], missing: [], preferredSkills: [], matchedPref: [] };

const reqPs = placementSkills.filter(ps => ps.importance === 'required');
const prefPs = placementSkills.filter(ps => ps.importance !== 'required');

const matchedReq = reqPs.filter(ps => userSkillNames.includes((ps.skills?.name || '').toLowerCase()));
const matchedPref = prefPs.filter(ps => userSkillNames.includes((ps.skills?.name || '').toLowerCase()));

const reqCoverage = reqPs.length > 0 ? matchedReq.length / reqPs.length : null;
const prefCoverage = prefPs.length > 0 ? matchedPref.length / prefPs.length : 0;

let score;

if (reqCoverage !== null) {
const curvedReq = Math.pow(reqCoverage, REQ_CURVE_POWER);
score = Math.round(100 * ((REQ_WEIGHT / 100) * curvedReq + (PREF_WEIGHT / 100) * prefCoverage));
if (matchedReq.length > 0) score += FLOOR_BOOST;
if (reqCoverage < 0.2) score = Math.min(score, LOW_CAP_MAX);
} else if (prefPs.length > 0) {
score = Math.round(100 * ((PREF_WEIGHT / 100) * prefCoverage));
} else {
score = 0;
}

if (score > 0) score = Math.min(score + BASE_BOOST, 100);
score = Math.max(0, Math.min(score, 100));

return {
score,
matched: matchedReq.map(ps => ps.skills?.name).filter(Boolean),
missing: reqPs.filter(ps => !userSkillNames.includes((ps.skills?.name || '').toLowerCase())).map(ps => ps.skills?.name).filter(Boolean),
preferredSkills: prefPs.map(ps => ps.skills?.name).filter(Boolean),
matchedPref: matchedPref.map(ps => ps.skills?.name).filter(Boolean),
};
}

async function runMatching() {
if (!allPlacements.length) return;

matchScores = {};
const inserts = [];

allPlacements.forEach(p => {
const { score, matched, missing, preferredSkills, matchedPref } = calculateScore(p);
matchScores[p.id] = { score, matched, missing, preferredSkills, matchedPref };
inserts.push({
user_id: currentUser.id,
placement_id: p.id,
fit_score: score,
gap_analysis_report: { skills_matched: matched, skills_missing: missing },
});
});

await sb.from('match_results').delete().eq('user_id', currentUser.id);
if (inserts.length) await sb.from('match_results').insert(inserts);

const scores = Object.values(matchScores).map(m => m.score);
const best = scores.length ? Math.max(...scores) : 0;

const bestEl = document.getElementById('stat-best-match');
bestEl.textContent = `${best}%`;
bestEl.style.color = best >= 70 ? '#2e7d32' : best >= 40 ? '#f59e0b' : best > 0 ? '#dc2626' : '';

renderTopMatches();
renderAllPlacements();
}

// ── GAP ANALYSIS ──────────────────────────────────────────────────────
async function openGapAnalysis(placementId, roleName) {
const modal = document.getElementById('gap-modal');
const content = document.getElementById('gap-modal-content');
const subtitle = document.getElementById('gap-modal-subtitle');

document.getElementById('gap-modal-title').textContent = 'Skill Gap Analysis';
subtitle.textContent = roleName ? `Missing required skills for: ${roleName}` : '';
content.innerHTML = '<div class="loading">Generating recommendations...</div>';
modal.classList.add('open');

const { data: { session } } = await sb.auth.getSession();
if (!session) {
content.innerHTML = '<div class="alert alert-error">Not authenticated.</div>';
return;
}

try {
const res = await fetch(`http://localhost:3001/api/match/gap-analysis/${placementId}`, {
headers: { 'Authorization': `Bearer ${session.access_token}` },
});
const json = await res.json();

if (!res.ok) {
content.innerHTML = `<div class="alert alert-error">${json.error}</div>`;
return;
}

if (!json.missing_skills || json.missing_skills.length === 0) {
content.innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>No skill gaps — you meet all required skills!</p></div>';
return;
}

content.innerHTML = json.missing_skills.map(item => `
<div class="gap-skill-card">
<div class="gap-skill-name">${item.skill}</div>
<ul class="gap-steps">
${item.how_to_improve.map(step => `<li>${step}</li>`).join('')}
</ul>
</div>
`).join('');
} catch (err) {
content.innerHTML = `<div class="alert alert-error">Failed to load: ${err.message}</div>`;
}
}

// ── RENDER FUNCTIONS ──────────────────────────────────────────────────
function scoreBadgeClass(score) {
if (score >= 70) return 'score-high';
if (score >= 40) return 'score-medium';
if (score > 0) return 'score-low';
return 'score-none';
}

function renderPlacementCard(p, opts = {}) {
const match = matchScores[p.id] || { score: 0, matched: [], missing: [], preferredSkills: [], matchedPref: [] };
const company = p.companies?.name || 'Unknown company';
const isBookmarked = opts.bookmarked;

const borderClass = match.score >= 70 ? 'match-high' : match.score >= 40 ? 'match-medium' : match.score > 0 ? 'match-low' : '';

const reqMatchedTags = match.matched.map(s =>
`<span class="badge badge-green">✓ ${s}</span>`
).join('');
const reqMissingTags = match.missing.map(s =>
`<span class="badge badge-red">✗ ${s}</span>`
).join('');

const prefMissing = (match.preferredSkills || []).filter(s => !(match.matchedPref || []).includes(s));
const prefMatchedTags = (match.matchedPref || []).map(s =>
`<span class="badge badge-blue">✓ ${s}</span>`
).join('');
const prefMissingTags = prefMissing.map(s =>
`<span class="badge badge-gray">${s}</span>`
).join('');

const fullDesc = p.description || '';
const shortDesc = fullDesc.slice(0, 160);
const needsExpand = fullDesc.length > 160;

return `
<div class="placement-card ${borderClass}" id="card-${p.id}">
<div class="placement-header">
<div>
<div class="placement-title">${p.title || 'Placement'}</div>
<div class="placement-company">${company}${p.companies?.industry ? ' · ' + p.companies.industry : ''}</div>
</div>
<div class="score-badge ${scoreBadgeClass(match.score)}">${match.score}%</div>
</div>
${fullDesc ? `
<p class="placement-desc" id="desc-short-${p.id}">
${shortDesc}${needsExpand ? '…' : ''}
${needsExpand ? `<button class="desc-toggle" onclick="expandDesc('${p.id}')">Read more</button>` : ''}
</p>
${needsExpand ? `<p class="placement-desc" id="desc-full-${p.id}" style="display:none;">${fullDesc} <button class="desc-toggle" onclick="collapseDesc('${p.id}')">Show less</button></p>` : ''}
` : ''}
<div class="placement-meta">
${p.location ? `<span>📍 ${p.location}</span>` : ''}
${p.salary_range ? `<span>💷 £${Number(p.salary_range).toLocaleString()}/yr</span>` : ''}
${p.deadline ? `<span>⏰ Deadline: ${new Date(p.deadline).toLocaleDateString()}</span>` : ''}
</div>
${reqMatchedTags || reqMissingTags ? `
<div class="skill-section">
<div class="skill-section-label">Required</div>
<div class="skill-pills">${reqMatchedTags}${reqMissingTags}</div>
</div>` : ''}
${prefMatchedTags || prefMissingTags ? `
<div class="skill-section">
<div class="skill-section-label">Preferred</div>
<div class="skill-pills">${prefMatchedTags}${prefMissingTags}</div>
</div>` : ''}
<div class="placement-actions">
${p.application_link ? `<a href="${p.application_link}" target="_blank" class="btn btn-primary btn-sm">Apply</a>` : p.companies?.website_url ? `<a href="${p.companies.website_url}" target="_blank" class="btn btn-primary btn-sm">Apply</a>` : ''}
<button class="btn btn-secondary btn-sm" onclick="toggleBookmark('${p.id}', this)" id="bm-${p.id}">
${isBookmarked ? '🔖 Saved' : '🔖 Save'}
</button>
${match.missing.length > 0 ? `<button class="btn btn-gap btn-sm" onclick="openGapAnalysis('${p.id}', '${(p.title || 'this role').replace(/'/g, "\\'")}')">Gap Analysis</button>` : ''}
</div>
</div>`;
}

function expandDesc(id) {
document.getElementById(`desc-short-${id}`).style.display = 'none';
document.getElementById(`desc-full-${id}`).style.display = 'block';
}
function collapseDesc(id) {
document.getElementById(`desc-full-${id}`).style.display = 'none';
document.getElementById(`desc-short-${id}`).style.display = 'block';
}

function renderTopMatches() {
const sorted = [...allPlacements]
.map(p => ({ ...p, _score: matchScores[p.id]?.score || 0 }))
.sort((a, b) => b._score - a._score)
.slice(0, 5);

const el = document.getElementById('top-matches-list');
if (!sorted.length) {
el.innerHTML = `<div class="empty-state"><div class="icon">🎯</div><p>No placements available yet.</p></div>`;
return;
}
el.innerHTML = sorted.map(p => renderPlacementCard(p)).join('');
}

function renderAllPlacements() {
const sorted = [...allPlacements]
.map(p => ({ ...p, _score: matchScores[p.id]?.score || 0 }))
.sort((a, b) => b._score - a._score);

const el = document.getElementById('placements-list');
if (!sorted.length) {
el.innerHTML = `<div class="empty-state"><div class="icon">💼</div><p>No active placements found.</p></div>`;
return;
}
el.innerHTML = sorted.map(p => renderPlacementCard(p)).join('');
}

function renderSkills() {
const grid = document.getElementById('skills-grid');
if (!userSkills.length) {
grid.innerHTML = `<p style="color:#9ca3af;font-size:0.875rem;">No skills yet — upload your CV to extract them automatically.</p>`;
return;
}
const levels = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];
grid.innerHTML = userSkills.map(s => `
<span class="skill-tag">
${s.skills?.name || s.skill_name}
${s.source === 'cv' ? `<span style="opacity:0.5;font-size:0.65rem;margin-left:2px;">CV</span>` : ''}
${s.proficiency_level ? `<span style="opacity:0.6;font-size:0.7rem;">(${levels[s.proficiency_level] || s.proficiency_level})</span>` : ''}
<button onclick="removeSkill('${s.skill_id}', '${s.skills?.name || ''}')" title="Remove">×</button>
</span>
`).join('');
}

// ── SKILLS CRUD ───────────────────────────────────────────────────────
async function addSkill() {
const input = document.getElementById('skill-input');
const levelSelect = document.getElementById('skill-level');
const msgEl = document.getElementById('skill-message');
const skillName = input.value.trim();

if (!skillName) { showMsg(msgEl, 'Enter a skill name.', 'error'); return; }

let skillId;
const { data: existing } = await sb
.from('skills')
.select('id')
.ilike('name', skillName)
.limit(1)
.maybeSingle();

if (existing) {
skillId = existing.id;
} else {
const { data: newSkill, error: createErr } = await sb
.from('skills')
.insert({ name: skillName, category: 'General' })
.select('id')
.single();
if (createErr) {
showMsg(msgEl, 'Could not add skill: ' + createErr.message, 'error');
return;
}
skillId = newSkill.id;
}

const { error } = await sb.from('student_skills').upsert(
{ user_id: currentUser.id, skill_id: skillId, proficiency_level: parseInt(levelSelect.value), source: 'manual' },
{ onConflict: 'user_id,skill_id' }
);

if (error) { showMsg(msgEl, 'Error: ' + error.message, 'error'); return; }

input.value = '';
showMsg(msgEl, `Added "${skillName}"!`, 'success');
await loadSkills();
runMatching();
}

async function removeSkill(skillId, name) {
if (!confirm(`Remove "${name}" from your skills?`)) return;
const { error } = await sb.from('student_skills').delete()
.eq('user_id', currentUser.id)
.eq('skill_id', skillId);
if (!error) { await loadSkills(); runMatching(); }
}

// ── CV UPLOAD ─────────────────────────────────────────────────────────
document.getElementById('cv-file-input').addEventListener('change', async (e) => {
const file = e.target.files[0];
if (!file) return;
await uploadCV(file);
e.target.value = '';
});

const dropzone = document.getElementById('cv-dropzone');
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', async e => {
e.preventDefault();
dropzone.classList.remove('drag-over');
const file = e.dataTransfer.files[0];
if (file) await uploadCV(file);
});

async function uploadCV(file) {
const msgEl = document.getElementById('cv-message');
const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
if (!allowed.includes(file.type)) {
showMsg(msgEl, 'Only PDF and DOCX files are accepted.', 'error'); return;
}
if (file.size > 10 * 1024 * 1024) {
showMsg(msgEl, 'File must be under 10 MB.', 'error'); return;
}

showMsg(msgEl, 'Uploading...', 'success');
const ext = file.name.split('.').pop();
const path = `${currentUser.id}/${Date.now()}.${ext}`;

const { error: uploadErr } = await sb.storage.from('cvs').upload(path, file, { contentType: file.type });
if (uploadErr) { showMsg(msgEl, 'Upload failed: ' + uploadErr.message, 'error'); return; }

const { data: { publicUrl } } = sb.storage.from('cvs').getPublicUrl(path);

showMsg(msgEl, 'Extracting skills from your CV...', 'success');
let extractedText = '';
try {
if (file.type === 'application/pdf') {
extractedText = await extractTextFromPDF(file);
} else {
const arrayBuffer = await file.arrayBuffer();
const result = await mammoth.extractRawText({ arrayBuffer });
extractedText = result.value;
}
} catch (e) {
console.warn('Text extraction failed:', e);
}

const { error: dbErr } = await sb.from('cv').insert({
user_id: currentUser.id,
file_url: publicUrl,
parsed_content: extractedText || null,
});

if (dbErr) { showMsg(msgEl, 'Saved file but DB error: ' + dbErr.message, 'error'); return; }

if (extractedText) {
await extractAndSaveSkills(extractedText, msgEl);
} else {
showMsg(msgEl, 'CV uploaded. Could not extract text — add skills manually.', 'success');
}

loadCV();
loadSkills();
}

async function extractTextFromPDF(file) {
const arrayBuffer = await file.arrayBuffer();
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
let text = '';
for (let i = 1; i <= pdf.numPages; i++) {
const page = await pdf.getPage(i);
const content = await page.getTextContent();
text += content.items.map(item => item.str).join(' ') + '\n';
}
return text;
}

async function extractAndSaveSkills(text, msgEl) {
const { data: { session } } = await sb.auth.getSession();
if (!session) { showMsg(msgEl, 'Not authenticated.', 'error'); return; }

const res = await fetch('http://localhost:3001/api/cv/extract-skills', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${session.access_token}`,
},
body: JSON.stringify({ text }),
});

const json = await res.json();

if (!res.ok) {
showMsg(msgEl, `CV uploaded but skill extraction failed: ${json.error}`, 'error');
return;
}

const skills = json.skills || [];
if (skills.length === 0) {
showMsg(msgEl, 'CV uploaded. No skills identified — you can add them manually.', 'success');
return;
}

showMsg(msgEl, `CV uploaded! Found ${skills.length} skills: ${skills.map(s => s.name).join(', ')}`, 'success');
runMatching();
}

// ── BOOKMARKS ─────────────────────────────────────────────────────────
async function toggleBookmark(placementId, btn) {
const isSaved = btn.textContent.includes('Saved');
btn.disabled = true;

if (isSaved) {
const { error } = await sb.from('bookmarks').delete()
.eq('user_id', currentUser.id)
.eq('placement_id', placementId);
if (error) { alert('Could not remove bookmark: ' + error.message); }
else { btn.textContent = '🔖 Save'; }
} else {
const { error } = await sb.from('bookmarks').upsert(
{ user_id: currentUser.id, placement_id: placementId },
{ onConflict: 'user_id,placement_id' }
);
if (error) { alert('Could not save bookmark: ' + error.message); }
else { btn.textContent = '🔖 Saved'; }
}

btn.disabled = false;
loadBookmarks();
}

// ── PROFILE ───────────────────────────────────────────────────────────
let profileData = null;

async function loadProfile() {
const { data, error } = await sb
.from('users')
.select('*')
.eq('id', currentUser.id)
.maybeSingle();
if (!error && data) {
profileData = data;
renderProfile(data);
const name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || currentUser.email.split('@')[0];
document.getElementById('navbar-welcome').textContent = `Welcome, ${name}`;
}
}

function renderProfile(data) {
const first = data.first_name || '';
const last = data.last_name || '';
const initials = ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
document.getElementById('profile-avatar').textContent = initials;
document.getElementById('profile-full-name').textContent = `${first} ${last}`.trim() || '—';
document.getElementById('profile-email-display').textContent = data.email || currentUser.email || '—';
document.getElementById('profile-firstname').value = first;
document.getElementById('profile-lastname').value = last;
document.getElementById('profile-degree').value = data.degree_programme || '';
document.getElementById('profile-year').value = data.year_of_study || '';
document.getElementById('profile-bio').value = data.bio || '';
document.getElementById('profile-linkedin').value = data.linkedin_url || '';
document.getElementById('profile-github').value = data.github_url || '';
document.getElementById('profile-location').value = data.location_preference || '';

const links = [];
if (data.linkedin_url) links.push(`<a href="${data.linkedin_url}" target="_blank" class="profile-link-badge">LinkedIn</a>`);
if (data.github_url) links.push(`<a href="${data.github_url}" target="_blank" class="profile-link-badge">GitHub</a>`);
document.getElementById('profile-ext-links').innerHTML = links.join('');
}

async function saveProfile() {
const msgEl = document.getElementById('profile-message');
const updates = {
first_name: document.getElementById('profile-firstname').value.trim(),
last_name: document.getElementById('profile-lastname').value.trim(),
degree_programme: document.getElementById('profile-degree').value || null,
year_of_study: document.getElementById('profile-year').value ? parseInt(document.getElementById('profile-year').value) : null,
bio: document.getElementById('profile-bio').value.trim() || null,
linkedin_url: document.getElementById('profile-linkedin').value.trim() || null,
github_url: document.getElementById('profile-github').value.trim() || null,
location_preference: document.getElementById('profile-location').value.trim() || null,
};

const { error } = await sb.from('users').update(updates).eq('id', currentUser.id);
if (error) { showMsg(msgEl, error.message, 'error'); return; }

profileData = { ...profileData, ...updates };
renderProfile(profileData);
const name = `${updates.first_name} ${updates.last_name}`.trim();
if (name) document.getElementById('navbar-welcome').textContent = `Welcome, ${name}`;
showMsg(msgEl, 'Profile saved!', 'success');
}

// ── AUTH ──────────────────────────────────────────────────────────────
async function handleSignIn() {
const email = document.getElementById('signin-email').value;
const password = document.getElementById('signin-password').value;
const msgEl = document.getElementById('auth-message');

const { error } = await sb.auth.signInWithPassword({ email, password });
if (error) { showMsg(msgEl, error.message, 'error'); }
}

function signupNext() {
const firstName = document.getElementById('signup-firstname').value.trim();
const lastName = document.getElementById('signup-lastname').value.trim();
const email = document.getElementById('signup-email').value.trim();
const password = document.getElementById('signup-password').value;
const msgEl = document.getElementById('signup-message');

if (!firstName || !lastName) { showMsg(msgEl, 'Please enter your full name.', 'error'); return; }
if (!email.endsWith('@bath.ac.uk')) { showMsg(msgEl, 'Only @bath.ac.uk email addresses are allowed.', 'error'); return; }
if (password.length < 8) { showMsg(msgEl, 'Password must be at least 8 characters.', 'error'); return; }

msgEl.innerHTML = '';
document.getElementById('signup-step-1').style.display = 'none';
document.getElementById('signup-step-2').style.display = 'block';
document.getElementById('step-dot-2').style.background = '#2563eb';
}

function signupBack() {
document.getElementById('signup-step-2').style.display = 'none';
document.getElementById('signup-step-1').style.display = 'block';
document.getElementById('step-dot-2').style.background = '#e5e7eb';
}

async function handleSignUp() {
const firstName = document.getElementById('signup-firstname').value.trim();
const lastName = document.getElementById('signup-lastname').value.trim();
const email = document.getElementById('signup-email').value.trim();
const password = document.getElementById('signup-password').value;
const degree = document.getElementById('signup-degree').value || null;
const year = document.getElementById('signup-year').value ? parseInt(document.getElementById('signup-year').value) : null;
const location = document.getElementById('signup-location').value.trim() || null;
const linkedin = document.getElementById('signup-linkedin').value.trim() || null;
const msgEl = document.getElementById('signup-message');

const { error } = await sb.auth.signUp({
email, password,
options: { data: { first_name: firstName, last_name: lastName } }
});

if (error) { showMsg(msgEl, error.message, 'error'); return; }

const { data: { session } } = await sb.auth.getSession();
if (session) {
await sb.from('users').update({
role: pendingRole,
degree_programme: degree,
year_of_study: year,
location_preference: location,
linkedin_url: linkedin,
}).eq('id', session.user.id);
}

await sb.auth.signOut();
showMsg(msgEl, 'Account created! Please sign in.', 'success');
setTimeout(() => openModal('signin'), 2000);
}

document.getElementById('btn-signout').addEventListener('click', () => sb.auth.signOut());
document.getElementById('staff-btn-signout').addEventListener('click', () => sb.auth.signOut());

// ── STAFF PORTAL ───────────────────────────────────────────────────────
let staffCompanies = [];
let editingPlacementId = null;
let modalRequiredSkills = [];
let modalPreferredSkills = [];

async function loadStaffData() {
await Promise.all([loadStaffPlacements(), loadStaffCompanies()]);
}

async function loadStaffCompanies() {
const { data } = await sb.from('companies').select('*').order('name');
staffCompanies = data || [];

const tbody = document.getElementById('staff-companies-body');
if (!staffCompanies.length) {
tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="text-align:center;padding:2rem;">No companies yet.</td></tr>';
return;
}
tbody.innerHTML = staffCompanies.map(c => `
<tr>
<td style="font-weight:600;">${c.name}</td>
<td>${c.industry || '—'}</td>
<td>${c.website_url ? `<a href="${c.website_url}" target="_blank" style="color:#2563eb;">${c.website_url}</a>` : '—'}</td>
<td style="text-align:right;">
<button class="btn btn-secondary btn-sm" onclick="openCompanyModal('${c.id}')">Edit</button>
</td>
</tr>
`).join('');
}

async function loadStaffPlacements() {
const { data } = await sb
.from('placements')
.select('*, companies(name)')
.order('created_at', { ascending: false });

const tbody = document.getElementById('staff-placements-body');
if (!data || data.length === 0) {
tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#9ca3af;">No placements yet. Add one to get started.</td></tr>';
return;
}
tbody.innerHTML = data.map(p => `
<tr>
<td style="font-weight:600;">${p.title || '—'}</td>
<td>${p.companies?.name || '—'}</td>
<td>${p.location || '—'}</td>
<td>${p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}</td>
<td><span class="badge ${p.is_active ? 'badge-green' : 'badge-gray'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
<td style="text-align:right;white-space:nowrap;">
<button class="btn btn-secondary btn-sm" onclick="openPlacementModal('${p.id}')">Edit</button>
<button class="btn btn-danger btn-sm" style="margin-left:0.4rem;" onclick="togglePlacementActive('${p.id}', ${p.is_active})">${p.is_active ? 'Deactivate' : 'Activate'}</button>
<button class="btn btn-danger btn-sm" style="margin-left:0.4rem;" onclick="deleteStaffPlacement('${p.id}', '${p.title?.replace(/'/g, "\\'")}')">Delete</button>
</td>
</tr>
`).join('');
}

async function openPlacementModal(placementId = null) {
editingPlacementId = placementId;
document.getElementById('placement-modal-title').textContent = placementId ? 'Edit Placement' : 'Add Placement';
document.getElementById('placement-modal-msg').innerHTML = '';

['p-title','p-description','p-location','p-salary','p-deadline','p-link']
.forEach(id => document.getElementById(id).value = '');
document.getElementById('p-company-search').value = '';
document.getElementById('p-company').value = '';
hideCompanyDropdown();

modalRequiredSkills = [];
modalPreferredSkills = [];
renderModalSkills();
document.getElementById('extract-skills-row').style.display = '';
document.getElementById('extract-skills-status').textContent = '';

if (placementId) await loadPlacementForEdit(placementId);
document.getElementById('placement-modal').classList.add('open');
}

async function loadPlacementForEdit(id) {
const { data } = await sb
.from('placements')
.select('*, placement_skills(importance, skills(name))')
.eq('id', id)
.single();
if (!data) return;

const company = staffCompanies.find(c => c.id === data.company_id);
document.getElementById('p-company-search').value = company?.name || '';
document.getElementById('p-company').value = data.company_id || '';
document.getElementById('p-title').value = data.title || '';
document.getElementById('p-description').value = data.description || '';
document.getElementById('p-location').value = data.location || '';
document.getElementById('p-salary').value = data.salary_range || '';
document.getElementById('p-deadline').value = data.deadline?.slice(0, 10) || '';
document.getElementById('p-link').value = data.application_link || '';

modalRequiredSkills = (data.placement_skills || [])
.filter(ps => ps.importance === 'required')
.map(ps => ps.skills?.name)
.filter(Boolean);
modalPreferredSkills = (data.placement_skills || [])
.filter(ps => ps.importance !== 'required')
.map(ps => ps.skills?.name)
.filter(Boolean);
renderModalSkills();

if (modalRequiredSkills.length || modalPreferredSkills.length) {
document.getElementById('extract-skills-row').style.display = 'none';
}
}

function closePlacementModal() {
document.getElementById('placement-modal').classList.remove('open');
editingPlacementId = null;
}

async function savePlacement() {
const msgEl = document.getElementById('placement-modal-msg');
const companyId = document.getElementById('p-company').value;
const title = document.getElementById('p-title').value.trim();
const description = document.getElementById('p-description').value.trim();
const location = document.getElementById('p-location').value.trim();

if (!companyId || !title || !description || !location) {
showMsg(msgEl, 'Company, title, description and location are required.', 'error'); return;
}

const payload = {
company_id: companyId,
title,
description,
location,
salary_range: document.getElementById('p-salary').value ? parseFloat(document.getElementById('p-salary').value) : null,
deadline: document.getElementById('p-deadline').value || null,
application_link: document.getElementById('p-link').value.trim() || null,
is_active: true,
};

let placementId = editingPlacementId;
if (placementId) {
const { error } = await sb.from('placements').update(payload).eq('id', placementId);
if (error) { showMsg(msgEl, error.message, 'error'); return; }
} else {
const { data, error } = await sb.from('placements').insert(payload).select().single();
if (error) { showMsg(msgEl, error.message, 'error'); return; }
placementId = data.id;
}

await savePlacementSkills(placementId);
closePlacementModal();
loadStaffPlacements();
}

async function savePlacementSkills(placementId) {
const { data: { session } } = await sb.auth.getSession();
await fetch(`http://localhost:3001/api/placements/${placementId}/skills`, {
method: 'PUT',
headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
body: JSON.stringify({ required: modalRequiredSkills, preferred: modalPreferredSkills }),
});
}

function renderModalSkills() {
const reqEl = document.getElementById('p-required-tags');
const prefEl = document.getElementById('p-preferred-tags');
if (!reqEl || !prefEl) return;
reqEl.innerHTML = modalRequiredSkills.map((s, i) =>
`<span class="skill-tag">${s}<button type="button" onclick="removeModalSkill('required',${i})">×</button></span>`
).join('');
prefEl.innerHTML = modalPreferredSkills.map((s, i) =>
`<span class="skill-tag">${s}<button type="button" onclick="removeModalSkill('preferred',${i})">×</button></span>`
).join('');
}

function removeModalSkill(type, index) {
if (type === 'required') modalRequiredSkills.splice(index, 1);
else modalPreferredSkills.splice(index, 1);
renderModalSkills();
}

function addModalSkill(type) {
const inputId = type === 'required' ? 'p-req-add' : 'p-pref-add';
const input = document.getElementById(inputId);
const name = input.value.trim();
if (!name) return;
const lower = name.toLowerCase();
if (type === 'required') {
if (!modalRequiredSkills.some(s => s.toLowerCase() === lower)) modalRequiredSkills.push(name);
} else {
if (!modalPreferredSkills.some(s => s.toLowerCase() === lower)) modalPreferredSkills.push(name);
}
input.value = '';
renderModalSkills();
}

async function extractSkillsFromDescription() {
const description = document.getElementById('p-description').value.trim();
const msgEl = document.getElementById('placement-modal-msg');
const statusEl = document.getElementById('extract-skills-status');
if (!description) {
showMsg(msgEl, 'Please enter a description before extracting skills.', 'error');
return;
}
statusEl.textContent = 'Extracting…';
const { data: { session } } = await sb.auth.getSession();
try {
const res = await fetch('http://localhost:3001/api/placements/extract-skills', {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
body: JSON.stringify({ description }),
});
const json = await res.json();
if (!res.ok) throw new Error(json.error || 'Skill extraction failed.');
const skills = json.skills || [];
modalRequiredSkills = skills.filter(s => s.importance === 'required').map(s => s.name);
modalPreferredSkills = skills.filter(s => s.importance !== 'required').map(s => s.name);
renderModalSkills();
statusEl.textContent = `${skills.length} skill${skills.length === 1 ? '' : 's'} extracted`;
} catch (err) {
showMsg(msgEl, err.message, 'error');
statusEl.textContent = '';
}
}

async function togglePlacementActive(id, currentlyActive) {
if (!confirm(`${currentlyActive ? 'Deactivate' : 'Activate'} this placement?`)) return;
await sb.from('placements').update({ is_active: !currentlyActive }).eq('id', id);
loadStaffPlacements();
}

async function deleteStaffPlacement(id, title) {
if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
const { data: { session } } = await sb.auth.getSession();
const res = await fetch(`http://localhost:3001/api/placements/${id}`, {
method: 'DELETE',
headers: { 'Authorization': `Bearer ${session.access_token}` },
});
if (!res.ok) {
const json = await res.json().catch(() => ({}));
alert(json.error || 'Failed to delete placement.');
return;
}
loadStaffPlacements();
}

// ── COMPANY AUTOCOMPLETE ───────────────────────────────────────────────
function filterCompanies(query) {
const dropdown = document.getElementById('p-company-dropdown');
const q = query.trim().toLowerCase();

const matches = q
? staffCompanies.filter(c => c.name.toLowerCase().includes(q))
: staffCompanies;

let html = matches.map(c => `
<div class="company-option" onmousedown="selectCompany('${c.id}', '${c.name.replace(/'/g, "\\'")}')">
${c.name}
${c.industry ? `<span class="co-industry">${c.industry}</span>` : ''}
</div>
`).join('');

if (q && !staffCompanies.some(c => c.name.toLowerCase() === q)) {
html += `<div class="company-option new-company" onmousedown="promptNewCompany('${query.trim().replace(/'/g, "\\'")}')">+ Add "${query.trim()}" as new company</div>`;
}

dropdown.innerHTML = html || '<div class="company-option" style="color:#9ca3af;cursor:default;">No companies found</div>';
dropdown.classList.add('open');
}

function selectCompany(id, name) {
document.getElementById('p-company-search').value = name;
document.getElementById('p-company').value = id;
document.getElementById('p-company-dropdown').classList.remove('open');
}

function hideCompanyDropdown() {
const dropdown = document.getElementById('p-company-dropdown');
if (dropdown) dropdown.classList.remove('open');
}

function promptNewCompany(prefillName) {
hideCompanyDropdown();
openCompanyModal();
if (prefillName) {
const nameInput = document.getElementById('c-name');
if (nameInput) nameInput.value = prefillName;
}
}

// ── COMPANY MODAL ──────────────────────────────────────────────────────
let editingCompanyId = null;

function openCompanyModal(companyId = null) {
editingCompanyId = companyId;
document.getElementById('company-modal-title').textContent = companyId ? 'Edit Company' : 'Add Company';
document.getElementById('company-modal-msg').innerHTML = '';
['c-name','c-industry','c-website','c-description'].forEach(id => document.getElementById(id).value = '');

if (companyId) {
const company = staffCompanies.find(c => c.id === companyId);
if (company) {
document.getElementById('c-name').value = company.name || '';
document.getElementById('c-industry').value = company.industry || '';
document.getElementById('c-website').value = company.website_url || '';
document.getElementById('c-description').value = company.description || '';
}
}
document.getElementById('company-modal').classList.add('open');
}

async function saveCompany() {
const msgEl = document.getElementById('company-modal-msg');
const name = document.getElementById('c-name').value.trim();
if (!name) { showMsg(msgEl, 'Company name is required.', 'error'); return; }

const payload = {
name,
industry: document.getElementById('c-industry').value.trim() || null,
website_url: document.getElementById('c-website').value.trim() || null,
description: document.getElementById('c-description').value.trim() || null,
};

if (editingCompanyId) {
const { error } = await sb.from('companies').update(payload).eq('id', editingCompanyId);
if (error) { showMsg(msgEl, error.message, 'error'); return; }
} else {
const { data: created, error } = await sb.from('companies').insert(payload).select('id').single();
if (error) { showMsg(msgEl, error.message, 'error'); return; }
if (created && document.getElementById('placement-modal').classList.contains('open')) {
document.getElementById('p-company-search').value = name;
document.getElementById('p-company').value = created.id;
}
}

document.getElementById('company-modal').classList.remove('open');
loadStaffCompanies();
}

// ── MODAL HELPERS ─────────────────────────────────────────────────────
function openModal(mode) {
if (mode === 'signin') pendingRole = 'student';
document.getElementById('auth-modal').classList.add('open');
document.getElementById('form-signin').style.display = mode === 'signin' ? 'block' : 'none';
document.getElementById('form-signup').style.display = mode === 'signup' ? 'block' : 'none';
document.getElementById('auth-message').innerHTML = '';
document.getElementById('signup-message').innerHTML = '';
document.getElementById('signup-step-1').style.display = 'block';
document.getElementById('signup-step-2').style.display = 'none';
document.getElementById('step-dot-2').style.background = '#e5e7eb';
}
function closeModal() { document.getElementById('auth-modal').classList.remove('open'); }
document.getElementById('auth-modal').addEventListener('click', e => {
if (e.target.id === 'auth-modal') closeModal();
});

// ── UTILITY ───────────────────────────────────────────────────────────
function showMsg(el, text, type) {
el.innerHTML = `<div class="alert alert-${type}">${text}</div>`;
}
