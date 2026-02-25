/* =========================
   localStorage keys
========================= */
const KEY_DB = "公司考績資料庫_v4";
const KEY_PERIOD = "公司考績期間_v4";

/* =========================
   DOM
========================= */
const elRocYear = document.getElementById("rocYear");
const elMonth = document.getElementById("month");
const elPeriodText = document.getElementById("periodText");
const elPageTitle = document.getElementById("pageTitle");
const elPeriodTip = document.getElementById("periodTip");

const elDept = document.getElementById("department");
const elStatus = document.getElementById("statusText");

const blockTeacher = document.getElementById("deptBlockTeacher");
const blockMarketing = document.getElementById("deptBlockMarketing");
const blockPlanner = document.getElementById("deptBlockPlanner");

const elKpiAvg = document.getElementById("kpiAvg");
const elKpiCount = document.getElementById("kpiCount");
const elKpiHigh = document.getElementById("kpiHigh");
const elKpiRisk = document.getElementById("kpiRisk");

const elAnalysisAvg = document.getElementById("analysisAvg");
const elAnalysisDesc = document.getElementById("analysisDesc");
const elAvgAttendance = document.getElementById("avgAttendance");
const elAvgWork = document.getElementById("avgWork");
const elAvgThird = document.getElementById("avgThird");

const elDeptList = document.getElementById("deptList");
const elCardGrid = document.getElementById("cardGrid");
const elTableBody = document.getElementById("tableBody");

const elImportBtn = document.getElementById("importBtn");
const elImportFile = document.getElementById("importFile");
const elCopyLastBtn = document.getElementById("copyLastBtn");
const elExportBtn = document.getElementById("exportBtn");
const elPdfBtn = document.getElementById("pdfBtn");

/* history modal */
const elHistoryModal = document.getElementById("historyModal");
const elHistoryTitle = document.getElementById("historyTitle");
const elHistorySub = document.getElementById("historySub");
const elHistoryBody = document.getElementById("historyBody");
const elHistoryClose = document.getElementById("historyClose");

/* =========================
   State
========================= */
let editingId = null;

/* =========================
   Events
========================= */
document.getElementById("saveBtn").addEventListener("click", onSave);
document.getElementById("clearBtn").addEventListener("click", () => clearForm(true));

elDept.addEventListener("change", updateDepartmentUI);
elRocYear.addEventListener("change", onPeriodChange);
elMonth.addEventListener("change", onPeriodChange);

elExportBtn.addEventListener("click", exportMonthJSON);
elImportBtn.addEventListener("click", () => elImportFile.click());
elImportFile.addEventListener("change", onImportJSON);
elCopyLastBtn.addEventListener("click", copyLastMonthToCurrent);
elPdfBtn.addEventListener("click", exportPDF);

elHistoryClose.addEventListener("click", closeHistory);
elHistoryModal.addEventListener("click", (e) => {
  const t = e.target;
  if (t && t.getAttribute && t.getAttribute("data-close") === "1") closeHistory();
});

/* =========================
   Helpers
========================= */
function clamp(n, min, max){ return Math.min(Math.max(n, min), max); }
function n0(v){ const x = parseFloat(v); return Number.isFinite(x) ? x : 0; }
function i0(v){ const x = parseInt(v, 10); return Number.isFinite(x) ? x : 0; }

function escapeHtml(s){
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

function getDefaultPeriod(){
  const d = new Date();
  return { rocYear: d.getFullYear() - 1911, month: d.getMonth() + 1 };
}
function readPeriod(){
  const saved = JSON.parse(localStorage.getItem(KEY_PERIOD) || "null");
  return saved || getDefaultPeriod();
}
function writePeriod(p){
  localStorage.setItem(KEY_PERIOD, JSON.stringify(p));
}
function periodKey(rocYear, month){ return `${rocYear}-${month}`; }
function currentPeriodKey(){
  return periodKey(i0(elRocYear.value), i0(elMonth.value));
}
function readDB(){ return JSON.parse(localStorage.getItem(KEY_DB) || "{}"); }
function writeDB(db){ localStorage.setItem(KEY_DB, JSON.stringify(db)); }
function getMonthList(key = currentPeriodKey()){
  const db = readDB();
  return db[key] || [];
}
function setMonthList(list, key = currentPeriodKey()){
  const db = readDB();
  db[key] = list;
  writeDB(db);
}
function personKey(name, dept){
  return `${(name||"").trim()}__${dept}`.toLowerCase();
}

/* =========================
   Department mapping
========================= */
function deptType(dept){
  if (dept === "學習諮商部門") return "TEACHER";
  if (dept === "行銷部門") return "MARKETING";
  return "PLANNER";
}
function thirdLabelForDept(dept){
  const t = deptType(dept);
  if (t === "TEACHER") return "諮商品質";
  if (t === "MARKETING") return "行銷成效";
  return "業務協助";
}

/* =========================
   Scoring - shared
========================= */
function calcAttendance(personalLeave, sickLeave){
  let score = 100;
  if (personalLeave > 8) score -= (personalLeave - 8);
  if (sickLeave > 16) score -= (sickLeave - 16);
  return clamp(score, 0, 100);
}
function fiveToHundred(score1to5){
  return clamp((score1to5 / 5) * 100, 0, 100);
}

/* Teacher: 出勤30 / 工作40 / 諮商品質30 */
function calcTeacherTotal(att, work, counseling){
  return clamp(att*0.3 + work*0.4 + counseling*0.3, 0, 100);
}

/* Marketing: 出勤30 / 工作30 / 行銷40（鼓勵超額） */
function calcMarketingPerformance(target, actual, seminarCount){
  if (target <= 0) return 0;

  const ratio = actual / target;
  let listScore = 0;

  // 1) 先把達標做到 75 分
  if (ratio <= 1){
    listScore = ratio * 75;
  }
  // 2) 超額 1.0~1.5 緩慢加成（最多到 85）
  else if (ratio <= 1.5){
    listScore = 75 + ((ratio - 1) / 0.5) * 10; // +0~10
  }
  // 3) 超過 1.5 視為滿檔（85）
  else{
    listScore = 85;
  }

  // 講座加分（鼓勵做活動）
  let bonus = 0;
  if (seminarCount === 1) bonus = 5;
  else if (seminarCount === 2) bonus = 10;
  else if (seminarCount >= 3) bonus = 15;

  return clamp(listScore + bonus, 0, 100);
}
function calcMarketingTotal(att, work, perf){
  return clamp(att*0.3 + work*0.3 + perf*0.4, 0, 100);
}

/* Planner: 出勤30 / 工作40 / 協助30（鼓勵超額） */
function calcPlannerPerformance(target, actual, leads){
  if (target <= 0) return 0;

  const ratio = actual / target;
  let contractScore = 0;

  // 達標做到 70
  if (ratio <= 1){
    contractScore = ratio * 70;
  }
  // 超額 1.0~1.5 緩慢加成到 80
  else if (ratio <= 1.5){
    contractScore = 70 + ((ratio - 1) / 0.5) * 10;
  }
  // 超過 1.5 直接 80
  else{
    contractScore = 80;
  }

  // 額外開發名單加分（鼓勵額外開發）
  let bonus = 0;
  if (leads >= 1 && leads <= 2) bonus = 5;
  else if (leads >= 3 && leads <= 4) bonus = 10;
  else if (leads >= 5) bonus = 15;

  return clamp(contractScore + bonus, 0, 100);
}
function calcPlannerTotal(att, work, perf){
  return clamp(att*0.3 + work*0.4 + perf*0.3, 0, 100);
}

/* =========================
   Grade + ring progress
========================= */
function getGradeInfo(score){
  if (score >= 95) return { grade:"S+", min:95, max:100, color:"#4f46e5" };
  if (score >= 90) return { grade:"S",  min:90, max:94,  color:"#6366f1" };
  if (score >= 85) return { grade:"A+", min:85, max:89,  color:"#22c55e" };
  if (score >= 80) return { grade:"A",  min:80, max:84,  color:"#10b981" };
  if (score >= 70) return { grade:"B",  min:70, max:79,  color:"#facc15" };
  if (score >= 60) return { grade:"C",  min:60, max:69,  color:"#fb923c" };
  return { grade:"D", min:0, max:59, color:"#ef4444" };
}
function ringProgress(score, info){
  const span = Math.max(1, info.max - info.min);
  return clamp((score - info.min) / span, 0, 1);
}

/* =========================
   UI - period
========================= */
function getPrevPeriod(rocYear, month){
  if (month > 1) return { rocYear, month: month - 1 };
  return { rocYear: rocYear - 1, month: 12 };
}
function updatePeriodText(){
  const y = i0(elRocYear.value);
  const m = i0(elMonth.value);
  elPeriodText.textContent = `考績期間：民國${y}年${m}月`;
  elPageTitle.textContent = `本月總覽（民國${y}年${m}月）`;

  const prev = getPrevPeriod(y, m);
  elPeriodTip.textContent = `上月：民國${prev.rocYear}年${prev.month}月（可一鍵複製）`;
}
function onPeriodChange(){
  const y = clamp(i0(elRocYear.value || 1), 1, 999);
  const m = clamp(i0(elMonth.value || 1), 1, 12);
  elRocYear.value = y;
  elMonth.value = String(m);
  writePeriod({ rocYear: y, month: m });
  updatePeriodText();
  render();
}

function updateDepartmentUI(){
  const dept = elDept.value;
  blockTeacher.style.display = (dept === "學習諮商部門") ? "block" : "none";
  blockMarketing.style.display = (dept === "行銷部門") ? "block" : "none";
  blockPlanner.style.display = (dept === "課程規劃部門") ? "block" : "none";
  elStatus.textContent = editingId ? "編輯模式：儲存會更新這筆" : "-";
}

/* =========================
   Form read/write
========================= */
function readForm(){
  const name = (document.getElementById("name").value || "").trim() || "未填寫";
  const dept = elDept.value;

  const personalLeave = n0(document.getElementById("leavePersonal").value);
  const sickLeave = n0(document.getElementById("leaveSick").value);
  const annualLeave = n0(document.getElementById("leaveAnnual").value);
  const officialLeave = n0(document.getElementById("leaveOfficial").value);

  const workScore = clamp(i0(document.getElementById("workScore").value), 0, 5);

  const counselingScore = clamp(i0(document.getElementById("counselingScore").value), 0, 5);

  const mktTarget = n0(document.getElementById("mktTarget").value);
  const mktActual = n0(document.getElementById("mktActual").value);
  const mktSeminars = clamp(i0(document.getElementById("mktSeminars").value), 0, 999);

  const plnTarget = n0(document.getElementById("plnTarget").value);
  const plnActual = n0(document.getElementById("plnActual").value);
  const plnLeads = clamp(i0(document.getElementById("plnLeads").value), 0, 999);

  return {
    name, dept,
    personalLeave, sickLeave, annualLeave, officialLeave,
    workScore,
    counselingScore,
    mktTarget, mktActual, mktSeminars,
    plnTarget, plnActual, plnLeads
  };
}

function fillFormFromRecord(r){
  editingId = r.id;

  document.getElementById("name").value = r.name || "";
  elDept.value = r.dept || "課程規劃部門";

  document.getElementById("leavePersonal").value = r.personalLeave ?? "";
  document.getElementById("leaveSick").value = r.sickLeave ?? "";
  document.getElementById("leaveAnnual").value = r.annualLeave ?? "";
  document.getElementById("leaveOfficial").value = r.officialLeave ?? "";

  document.getElementById("workScore").value = r.workScore ?? "";

  document.getElementById("counselingScore").value = r.counselingScore ?? "";

  document.getElementById("mktTarget").value = r.mktTarget ?? "";
  document.getElementById("mktActual").value = r.mktActual ?? "";
  document.getElementById("mktSeminars").value = r.mktSeminars ?? "";

  document.getElementById("plnTarget").value = r.plnTarget ?? "";
  document.getElementById("plnActual").value = r.plnActual ?? "";
  document.getElementById("plnLeads").value = r.plnLeads ?? "";

  updateDepartmentUI();
  elStatus.textContent = "編輯模式：修改後按儲存即可";
  window.location.hash = "#form";
}

function clearForm(resetDept=true){
  editingId = null;

  document.getElementById("name").value = "";
  document.getElementById("leavePersonal").value = "";
  document.getElementById("leaveSick").value = "";
  document.getElementById("leaveAnnual").value = "";
  document.getElementById("leaveOfficial").value = "";
  document.getElementById("workScore").value = "";

  document.getElementById("counselingScore").value = "";
  document.getElementById("mktTarget").value = "";
  document.getElementById("mktActual").value = "";
  document.getElementById("mktSeminars").value = "";
  document.getElementById("plnTarget").value = "";
  document.getElementById("plnActual").value = "";
  document.getElementById("plnLeads").value = "";

  if (resetDept){
    elDept.value = "課程規劃部門";
  }
  updateDepartmentUI();
  elStatus.textContent = "-";
}

/* =========================
   Normalize imported record
========================= */
function normalizeImportedRecord(raw){
  const dept = raw.dept || raw.department || raw.部門 || "課程規劃部門";
  const name = (raw.name || raw.姓名 || raw.employeeName || "").toString().trim() || "未填寫";

  const rec = {
    name,
    dept,
    personalLeave: n0(raw.personalLeave ?? raw.事假 ?? raw.leavePersonal),
    sickLeave: n0(raw.sickLeave ?? raw.病假 ?? raw.leaveSick),
    annualLeave: n0(raw.annualLeave ?? raw.特休 ?? raw.leaveAnnual),
    officialLeave: n0(raw.officialLeave ?? raw.公假 ?? raw.leaveOfficial),
    workScore: clamp(i0(raw.workScore ?? raw.工作表現), 0, 5),

    counselingScore: clamp(i0(raw.counselingScore ?? raw.諮商品質), 0, 5),

    mktTarget: n0(raw.mktTarget ?? raw.名單目標),
    mktActual: n0(raw.mktActual ?? raw.名單實際),
    mktSeminars: clamp(i0(raw.mktSeminars ?? raw.講座場次), 0, 999),

    plnTarget: n0(raw.plnTarget ?? raw.簽約目標),
    plnActual: n0(raw.plnActual ?? raw.簽約實際),
    plnLeads: clamp(i0(raw.plnLeads ?? raw.開發名單), 0, 999),
  };

  const key = personKey(name, dept);
  const now = Date.now();
  return {
    id: i0(raw.id) || (now + Math.floor(Math.random()*100000)),
    _personKey: key,
    ...rec,
    updatedAt: now
  };
}

/* =========================
   Compute per record
========================= */
function computeScores(rec){
  const attendance = calcAttendance(rec.personalLeave, rec.sickLeave);
  const work = fiveToHundred(rec.workScore);

  const t = deptType(rec.dept);
  let thirdLabel = thirdLabelForDept(rec.dept);
  let third = 0;
  let total = 0;

  if (t === "TEACHER"){
    third = fiveToHundred(rec.counselingScore);
    total = calcTeacherTotal(attendance, work, third);
  } else if (t === "MARKETING"){
    third = calcMarketingPerformance(rec.mktTarget, rec.mktActual, rec.mktSeminars);
    total = calcMarketingTotal(attendance, work, third);
  } else {
    third = calcPlannerPerformance(rec.plnTarget, rec.plnActual, rec.plnLeads);
    total = calcPlannerTotal(attendance, work, third);
  }

  const gradeInfo = getGradeInfo(total);
  const progress = ringProgress(total, gradeInfo);

  return {
    attendance, work, third, thirdLabel,
    total: Math.round(total * 10) / 10,
    gradeInfo,
    progress
  };
}

/* =========================
   Save / delete
========================= */
function onSave(){
  const rec = readForm();
  const list = getMonthList();

  const key = personKey(rec.name, rec.dept);
  const now = Date.now();

  // 1) 編輯模式：用 id 更新
  if (editingId !== null){
    const idx = list.findIndex(x => x.id === editingId);
    if (idx >= 0){
      list[idx] = {
        ...list[idx],
        _personKey: key,
        ...rec,
        updatedAt: now
      };
      setMonthList(list);
      elStatus.textContent = "已更新（編輯完成）";
      clearForm(false);
      render();
      return;
    }
    // 如果找不到（極少數），就降級成「同人覆蓋」
  }

  // 2) 一般模式：同月同人覆蓋（同名＋同部門）
  const idx2 = list.findIndex(x => x._personKey === key);
  const payload = {
    id: (idx2 >= 0) ? list[idx2].id : now,
    _personKey: key,
    ...rec,
    updatedAt: now
  };

  if (idx2 >= 0){
    list[idx2] = payload;
    elStatus.textContent = "已更新（同月同人覆蓋）";
  } else {
    list.push(payload);
    elStatus.textContent = "已新增（本月新增一筆）";
  }

  setMonthList(list);
  clearForm(false);
  render();
}

function deleteRecord(id){
  let list = getMonthList();
  list = list.filter(x => x.id !== id);
  setMonthList(list);
  render();
}

/* =========================
   Export / Import
========================= */
function exportMonthJSON(){
  const list = getMonthList();
  const y = i0(elRocYear.value);
  const m = i0(elMonth.value);
  const filename = `考績_民國${y}年${m}月.json`;

  const blob = new Blob([JSON.stringify(list, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function onImportJSON(){
  const file = elImportFile.files && elImportFile.files[0];
  elImportFile.value = "";
  if (!file) return;

  try{
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)){
      alert("匯入失敗：JSON 內容必須是陣列（多筆資料）");
      return;
    }

    const incoming = parsed.map(normalizeImportedRecord);

    const list = getMonthList();
    const map = new Map(list.map(r => [r._personKey, r]));
    incoming.forEach(r => map.set(r._personKey, r));

    const merged = Array.from(map.values());
    setMonthList(merged);

    elStatus.textContent = `已匯入：${incoming.length} 筆（合併後本月共 ${merged.length} 筆）`;
    render();
  }catch(err){
    console.error(err);
    alert("匯入失敗：請確認檔案為合法 JSON");
  }
}

/* =========================
   Copy last month
========================= */
function copyLastMonthToCurrent(){
  const y = i0(elRocYear.value);
  const m = i0(elMonth.value);

  const prev = getPrevPeriod(y, m);
  const prevKey = periodKey(prev.rocYear, prev.month);
  const prevList = getMonthList(prevKey);

  if (!prevList.length){
    alert(`上月（民國${prev.rocYear}年${prev.month}月）沒有資料，無法複製。`);
    return;
  }

  const now = Date.now();
  const copied = prevList.map((r, idx) => {
    const base = normalizeImportedRecord(r);
    return {
      ...base,
      id: now + idx + Math.floor(Math.random()*1000),
      updatedAt: now
    };
  });

  const currentList = getMonthList();
  const map = new Map(currentList.map(r => [r._personKey, r]));
  copied.forEach(r => map.set(r._personKey, r));

  const merged = Array.from(map.values());
  setMonthList(merged);

  elStatus.textContent = `已複製上月：${copied.length} 筆（本月共 ${merged.length} 筆）`;
  render();
}

/* =========================
   History modal
========================= */
function openHistory(name, dept){
  const key = personKey(name, dept);
  const db = readDB();
  const keys = Object.keys(db);

  const rows = [];
  keys.forEach(pk => {
    const list = db[pk] || [];
    const hit = list.find(r => r._personKey === key);
    if (hit){
      const s = computeScores(hit);
      const [ry, mm] = pk.split("-").map(i0);
      rows.push({
        rocYear: ry,
        month: mm,
        grade: s.gradeInfo.grade,
        total: s.total,
        attendance: Math.round(s.attendance),
        work: Math.round(s.work),
        thirdLabel: s.thirdLabel,
        third: Math.round(s.third)
      });
    }
  });

  rows.sort((a,b) => (b.rocYear - a.rocYear) || (b.month - a.month));

  elHistoryTitle.textContent = `歷史紀錄｜${name}`;
  elHistorySub.textContent = `部門：${dept}｜共 ${rows.length} 筆`;

  if (!rows.length){
    elHistoryBody.innerHTML = `<tr><td colspan="7" class="muted">尚無歷史資料</td></tr>`;
  } else {
    elHistoryBody.innerHTML = rows.map(r => `
      <tr>
        <td>民國${r.rocYear}年${r.month}月</td>
        <td>${r.grade}</td>
        <td><strong>${r.total}</strong></td>
        <td>${r.attendance}</td>
        <td>${r.work}</td>
        <td>${escapeHtml(r.thirdLabel)}</td>
        <td>${r.third}</td>
      </tr>
    `).join("");
  }

  elHistoryModal.setAttribute("aria-hidden", "false");
}
function closeHistory(){
  elHistoryModal.setAttribute("aria-hidden", "true");
}

/* =========================
   Export PDF (print)
========================= */
function exportPDF(){
  const list = getMonthList();
  const y = i0(elRocYear.value);
  const m = i0(elMonth.value);

  const computed = list
    .map(r => ({ ...r, _score: computeScores(r) }))
    .sort((a,b) => b._score.total - a._score.total);

  const n = computed.length;
  const avg = n ? Math.round(computed.reduce((s,r)=>s+r._score.total,0)/n) : 0;

  const html = `
<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>考績_民國${y}年${m}月</title>
<style>
  body{ font-family: -apple-system, system-ui, "PingFang TC", "Noto Sans TC", sans-serif; margin: 28px; color:#111827; }
  h1{ margin:0 0 6px; font-size:22px; }
  .sub{ color:#6b7280; font-size:12px; margin-bottom:16px; }
  .kpi{ display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
  .k{ border:1px solid rgba(17,24,39,.12); border-radius:12px; padding:10px 12px; min-width:180px; }
  .k .l{ font-size:12px; color:#6b7280; }
  .k .v{ font-size:18px; font-weight:900; margin-top:4px; }
  table{ width:100%; border-collapse:collapse; margin-top:10px; }
  th,td{ border-bottom:1px solid rgba(17,24,39,.12); text-align:left; padding:10px 8px; font-size:12px; white-space:nowrap; }
  th{ color:#6b7280; font-weight:900; }
  @media print{ body{ margin: 10mm; } .noPrint{ display:none; } }
</style>
</head>
<body>
  <h1>公司考績報表</h1>
  <div class="sub">考績期間：民國${y}年${m}月｜人數：${n}｜平均：${avg}</div>

  <div class="kpi">
    <div class="k"><div class="l">整體平均</div><div class="v">${avg}</div></div>
    <div class="k"><div class="l">S 以上</div><div class="v">${computed.filter(r=>r._score.total>=90).length}</div></div>
    <div class="k"><div class="l">低於 C</div><div class="v">${computed.filter(r=>r._score.total<70).length}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>姓名</th>
        <th>部門</th>
        <th>等級</th>
        <th>總分</th>
        <th>出勤</th>
        <th>工作</th>
        <th>第三項</th>
        <th>第三項分</th>
        <th>事假</th>
        <th>病假</th>
        <th>特休</th>
        <th>公假</th>
      </tr>
    </thead>
    <tbody>
      ${computed.map(r => `
        <tr>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.dept)}</td>
          <td>${r._score.gradeInfo.grade}</td>
          <td><strong>${r._score.total}</strong></td>
          <td>${Math.round(r._score.attendance)}</td>
          <td>${Math.round(r._score.work)}</td>
          <td>${escapeHtml(r._score.thirdLabel)}</td>
          <td>${Math.round(r._score.third)}</td>
          <td>${r.personalLeave}</td>
          <td>${r.sickLeave}</td>
          <td>${r.annualLeave}</td>
          <td>${r.officialLeave}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="sub noPrint" style="margin-top:14px;">
    提示：請在列印視窗選擇「存成 PDF」。
  </div>

<script>setTimeout(()=>window.print(), 250);</script>
</body>
</html>
  `;

  const w = window.open("", "_blank");
  if (!w){
    alert("無法開啟列印視窗：請確認瀏覽器沒有阻擋彈出視窗。");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* =========================
   Render
========================= */
function render(){
  const list = getMonthList();
  elDeptList.innerHTML = "";
  elCardGrid.innerHTML = "";
  elTableBody.innerHTML = "";

  const computed = list
    .map(r => ({ ...r, _score: computeScores(r) }))
    .sort((a,b) => b._score.total - a._score.total);

  const n = computed.length;

  let sumTotal=0, sumAtt=0, sumWork=0, sumThird=0;
  let high=0, risk=0;

  const deptAgg = {};

  computed.forEach(r=>{
    const s = r._score;
    sumTotal += s.total;
    sumAtt += s.attendance;
    sumWork += s.work;
    sumThird += s.third;

    if (s.total >= 90) high++;
    if (s.total < 70) risk++;

    if (!deptAgg[r.dept]){
      deptAgg[r.dept] = { dept:r.dept, count:0, sumTotal:0, sumAtt:0, sumWork:0, sumThird:0 };
    }
    const d = deptAgg[r.dept];
    d.count++;
    d.sumTotal += s.total;
    d.sumAtt += s.attendance;
    d.sumWork += s.work;
    d.sumThird += s.third;
  });

  const avgTotal = n ? Math.round((sumTotal/n)*10)/10 : 0;
  const avgAtt = n ? Math.round(sumAtt/n) : 0;
  const avgWork = n ? Math.round(sumWork/n) : 0;
  const avgThird = n ? Math.round(sumThird/n) : 0;

  elKpiAvg.textContent = avgTotal ? String(avgTotal) : "-";
  elKpiCount.textContent = `共 ${n} 人`;
  elKpiHigh.textContent = String(high);
  elKpiRisk.textContent = String(risk);

  elAnalysisAvg.textContent = avgTotal ? String(avgTotal) : "-";
  elAnalysisDesc.textContent = n ? "分數為內部管理用，卡片不顯示分數。" : "本月尚無資料，請先新增。";
  elAvgAttendance.textContent = n ? String(avgAtt) : "-";
  elAvgWork.textContent = n ? String(avgWork) : "-";
  elAvgThird.textContent = n ? String(avgThird) : "-";

  // 部門平均
  const deptArr = Object.values(deptAgg)
    .map(d => ({
      dept: d.dept,
      count: d.count,
      avgTotal: Math.round((d.sumTotal/d.count)*10)/10,
      avgAtt: Math.round(d.sumAtt/d.count),
      avgWork: Math.round(d.sumWork/d.count),
      avgThird: Math.round(d.sumThird/d.count),
      thirdLabel: thirdLabelForDept(d.dept)
    }))
    .sort((a,b)=> b.avgTotal - a.avgTotal);

  elDeptList.innerHTML = deptArr.map(d => `
    <div class="deptCard">
      <div class="deptTop">
        <div class="deptName">${escapeHtml(d.dept)}</div>
        <div class="deptAvg">${d.avgTotal}</div>
      </div>
      <div class="deptBottom">
        <span>出勤 ${d.avgAtt}</span>
        <span>工作 ${d.avgWork}</span>
        <span>${escapeHtml(d.thirdLabel)} ${d.avgThird}</span>
        <span>人數 ${d.count}</span>
      </div>
    </div>
  `).join("");

  // 卡片
  computed.forEach((r, idx)=>{
    const s = r._score;
    const info = s.gradeInfo;

    const R = 56;
    const C = 2 * Math.PI * R;

    const attPct = clamp(Math.round(s.attendance), 0, 100);
    const workPct = clamp(Math.round(s.work), 0, 100);
    const thirdPct = clamp(Math.round(s.third), 0, 100);

    const card = document.createElement("div");
    card.className = "empCard";
    card.innerHTML = `
      <div class="empHead">
        <div class="empName">${escapeHtml(r.name)}</div>
        <p class="empDept">${escapeHtml(r.dept)}</p>
      </div>

      <div class="ringWrap">
        <svg width="170" height="170" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="${R}" stroke="#e5e7eb" stroke-width="12" fill="none"></circle>

          <circle class="ring"
            cx="80" cy="80" r="${R}"
            stroke="${info.color}"
            stroke-width="12"
            fill="none"
            stroke-linecap="round"
            transform="rotate(-90 80 80)"
            stroke-dasharray="${C}"
            stroke-dashoffset="${C}"
            data-progress="${s.progress}">
          </circle>

          <!-- 只顯示級別（不顯示分數） -->
          <text x="50%" y="54%" text-anchor="middle" font-size="22" font-weight="950">${info.grade}</text>
        </svg>
      </div>

      <div class="meterWrap">
        <div class="meterRow">
          <div class="meterLabel">出勤</div>
          <div class="meterTrack"><div class="meterFill att" style="width:${attPct}%"></div></div>
        </div>
        <div class="meterRow">
          <div class="meterLabel">工作</div>
          <div class="meterTrack"><div class="meterFill work" style="width:${workPct}%"></div></div>
        </div>
        <div class="meterRow">
          <div class="meterLabel">${escapeHtml(s.thirdLabel)}</div>
          <div class="meterTrack"><div class="meterFill third" style="width:${thirdPct}%"></div></div>
        </div>
      </div>

      <div class="empMeta">
        事假 ${r.personalLeave}h｜病假 ${r.sickLeave}h｜特休 ${r.annualLeave}h｜公假 ${r.officialLeave}h
      </div>

      <div class="cardActions">
        <button class="btn ghost" type="button" data-his="${r.id}">歷史</button>
        <button class="btn ghost" type="button" data-edit="${r.id}">編輯</button>
        <button class="btn danger" type="button" data-del="${r.id}">刪除</button>
      </div>
    `;
    elCardGrid.appendChild(card);

    card.querySelector("[data-del]").addEventListener("click", (e)=>{
      const id = i0(e.currentTarget.getAttribute("data-del"));
      deleteRecord(id);
    });

    card.querySelector("[data-edit]").addEventListener("click", (e)=>{
      const id = i0(e.currentTarget.getAttribute("data-edit"));
      const hit = getMonthList().find(x => x.id === id);
      if (hit) fillFormFromRecord(hit);
    });

    card.querySelector("[data-his]").addEventListener("click", ()=>{
      openHistory(r.name, r.dept);
    });
  });

  // 列表（你自己管理用，保留分數）
  computed.forEach(r=>{
    const s = r._score;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.dept)}</td>
      <td><strong>${s.gradeInfo.grade}</strong></td>
      <td><strong>${s.total}</strong></td>
      <td>${Math.round(s.attendance)}</td>
      <td>${Math.round(s.work)}</td>
      <td>${escapeHtml(s.thirdLabel)}</td>
      <td>${Math.round(s.third)}</td>
      <td>${r.personalLeave}</td>
      <td>${r.sickLeave}</td>
      <td>${r.annualLeave}</td>
      <td>${r.officialLeave}</td>
      <td>
        <button class="btn ghost" type="button" data-edit="${r.id}">編輯</button>
        <button class="btn danger" type="button" data-del="${r.id}">刪除</button>
      </td>
    `;
    elTableBody.appendChild(tr);

    tr.querySelector("[data-del]").addEventListener("click",(e)=>{
      const id = i0(e.currentTarget.getAttribute("data-del"));
      deleteRecord(id);
    });
    tr.querySelector("[data-edit]").addEventListener("click",(e)=>{
      const id = i0(e.currentTarget.getAttribute("data-edit"));
      const hit = getMonthList().find(x => x.id === id);
      if (hit) fillFormFromRecord(hit);
    });
  });

  animateRings();
}

/* 同心圓動畫 */
function animateRings(){
  const rings = document.querySelectorAll(".ring");
  rings.forEach(ring=>{
    const progress = clamp(parseFloat(ring.getAttribute("data-progress") || "0"), 0, 1);
    const dashArray = parseFloat(ring.getAttribute("stroke-dasharray") || "0");
    const targetOffset = dashArray * (1 - progress);

    // reset then animate
    ring.style.transition = "none";
    ring.setAttribute("stroke-dashoffset", String(dashArray));

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        ring.style.transition = "stroke-dashoffset 0.9s ease";
        ring.setAttribute("stroke-dashoffset", String(targetOffset));
      });
    });
  });
}

/* =========================
   Init
========================= */
(function init(){
  const p = readPeriod();
  elRocYear.value = p.rocYear;
  elMonth.value = String(p.month);
  updatePeriodText();
  updateDepartmentUI();
  render();
})();
