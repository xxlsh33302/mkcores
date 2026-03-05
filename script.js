/* =========================
   localStorage keys
========================= */
const KEY_DB = "公司考績資料庫_v4";
const KEY_PERIOD = "公司考績期間_v4";
const KEY_REVENUE = "公司營收設定_v1"; // 依月份保存：目標、老闆收入
const KEY_COST = "公司費用設定_v1"; // 依月份保存：固定費用、變動成本

/* =========================
   DOM
========================= */
const elRocYear = document.getElementById("rocYear");
const elMonth = document.getElementById("month");
const elPeriodText = document.getElementById("periodText");
const elPageTitle = document.getElementById("pageTitle");
const elPeriodTip = document.getElementById("periodTip");

const elRevenueTarget = document.getElementById("revenueTarget");
const elBossCourseRevenue = document.getElementById("bossCourseRevenue");
const elBossTripRevenue = document.getElementById("bossTripRevenue");

const elCostRent = document.getElementById("costRent");
const elCostSystem = document.getElementById("costSystem");
const elCostPayroll = document.getElementById("costPayroll");
const elCostAds = document.getElementById("costAds");

const elCostCourse = document.getElementById("costCourse");
const elCostTrip = document.getElementById("costTrip");
const elCostTeacherShare = document.getElementById("costTeacherShare");

const elKpiRevenue = document.getElementById("kpiRevenue");
const elKpiRevenueRate = document.getElementById("kpiRevenueRate");
const elKpiProfit = document.getElementById("kpiProfit");
const elKpiProfitRate = document.getElementById("kpiProfitRate");

const elKpiCardRevenueRate = document.getElementById("kpiCardRevenueRate");
const elKpiCardProfitRate = document.getElementById("kpiCardProfitRate");

const elDept = document.getElementById("department");
const elStatus = document.getElementById("statusText");

const elCleanCount = document.getElementById("cleanCount");
const elCleanRequiredText = document.getElementById("cleanRequiredText");

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

/* ✅ 修正：用強制刷新，避免切換部門不更新 */
elDept.addEventListener("change", forceRefreshDeptBlocks);

elRocYear.addEventListener("change", onPeriodChange);
elMonth.addEventListener("change", onPeriodChange);

// 營收設定（只影響課程規劃部門與總覽）
[elRevenueTarget, elBossCourseRevenue, elBossTripRevenue].forEach((el)=>{
  if (!el) return;
  el.addEventListener("change", onRevenueSettingChange);
});

// 費用設定（公司損益）
[elCostRent, elCostSystem, elCostPayroll, elCostAds, elCostCourse, elCostTrip, elCostTeacherShare].forEach((el)=>{
  if (!el) return;
  el.addEventListener("change", onCostSettingChange);
});

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

function readRevenueDB(){ return JSON.parse(localStorage.getItem(KEY_REVENUE) || "{}"); }
function writeRevenueDB(db){ localStorage.setItem(KEY_REVENUE, JSON.stringify(db)); }
function defaultRevenueSetting(){ return { target: 800000, bossCourse: 0, bossTrip: 0 }; }
function readRevenueSetting(key = currentPeriodKey()){
  const db = readRevenueDB();
  return db[key] || defaultRevenueSetting();
}
function writeRevenueSetting(setting, key = currentPeriodKey()){
  const db = readRevenueDB();
  db[key] = {
    target: n0(setting.target),
    bossCourse: n0(setting.bossCourse),
    bossTrip: n0(setting.bossTrip),
  };
  writeRevenueDB(db);
}

function readCostDB(){ return JSON.parse(localStorage.getItem(KEY_COST) || "{}"); }
function writeCostDB(db){ localStorage.setItem(KEY_COST, JSON.stringify(db)); }

function defaultCostSetting(){
  return {
    fixed: { rent: 0, system: 0, payroll: 0, ads: 0 },
    variable: { course: 0, trip: 0, teacherShare: 0 }
  };
}

function ensureCostSetting(key){
  const db = readCostDB();
  if (db[key]) return db[key];

  // 新月份：固定費用自動帶入上月（若上月存在）
  const [ry, mm] = key.split("-").map(i0);
  const prev = getPrevPeriod(ry, mm);
  const prevKey = periodKey(prev.rocYear, prev.month);

  const base = defaultCostSetting();
  const prevSetting = db[prevKey];
  if (prevSetting && prevSetting.fixed){
    base.fixed = {
      rent: n0(prevSetting.fixed.rent),
      system: n0(prevSetting.fixed.system),
      payroll: n0(prevSetting.fixed.payroll),
      ads: n0(prevSetting.fixed.ads),
    };
  }

  db[key] = base;
  writeCostDB(db);
  return base;
}

function readCostSetting(key = currentPeriodKey()){
  const db = readCostDB();
  return db[key] || ensureCostSetting(key);
}

function writeCostSetting(setting, key = currentPeriodKey()){
  const db = readCostDB();
  db[key] = {
    fixed: {
      rent: n0(setting.fixed?.rent),
      system: n0(setting.fixed?.system),
      payroll: n0(setting.fixed?.payroll),
      ads: n0(setting.fixed?.ads),
    },
    variable: {
      course: n0(setting.variable?.course),
      trip: n0(setting.variable?.trip),
      teacherShare: n0(setting.variable?.teacherShare),
    }
  };
  writeCostDB(db);
}

function loadCostSettingToUI(){
  const s = readCostSetting();
  if (elCostRent) elCostRent.value = String(s.fixed?.rent ?? 0);
  if (elCostSystem) elCostSystem.value = String(s.fixed?.system ?? 0);
  if (elCostPayroll) elCostPayroll.value = String(s.fixed?.payroll ?? 0);
  if (elCostAds) elCostAds.value = String(s.fixed?.ads ?? 0);

  if (elCostCourse) elCostCourse.value = String(s.variable?.course ?? 0);
  if (elCostTrip) elCostTrip.value = String(s.variable?.trip ?? 0);
  if (elCostTeacherShare) elCostTeacherShare.value = String(s.variable?.teacherShare ?? 0);
}

function onCostSettingChange(){
  writeCostSetting({
    fixed: {
      rent: n0(elCostRent?.value),
      system: n0(elCostSystem?.value),
      payroll: n0(elCostPayroll?.value),
      ads: n0(elCostAds?.value),
    },
    variable: {
      course: n0(elCostCourse?.value),
      trip: n0(elCostTrip?.value),
      teacherShare: n0(elCostTeacherShare?.value),
    }
  });
  render();
}

function loadRevenueSettingToUI(){
  const s = readRevenueSetting();
  if (elRevenueTarget) elRevenueTarget.value = String(s.target ?? 800000);
  if (elBossCourseRevenue) elBossCourseRevenue.value = String(s.bossCourse ?? 0);
  if (elBossTripRevenue) elBossTripRevenue.value = String(s.bossTrip ?? 0);
}
function onRevenueSettingChange(){
  writeRevenueSetting({
    target: n0(elRevenueTarget?.value),
    bossCourse: n0(elBossCourseRevenue?.value),
    bossTrip: n0(elBossTripRevenue?.value),
  });
  render();
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
  if (t === "TEACHER") return "教學表現";
  if (t === "MARKETING") return "行銷表現";
  return "業績狀況";
}

/* =========================
   ✅ 強制刷新部門專項區塊（修正你遇到的問題）
========================= */
function forceRefreshDeptBlocks(){
  // 先全部關掉，避免殘影/停留
  blockTeacher.style.display = "none";
  blockMarketing.style.display = "none";
  blockPlanner.style.display = "none";

  const dept = elDept.value;

  if (String(dept||"").includes("學習諮商部門")) blockTeacher.style.display = "block";
  else if (String(dept||"").includes("行銷部門")) blockMarketing.style.display = "block";
  else blockPlanner.style.display = "block";

  elStatus.textContent = editingId ? "編輯模式：儲存會更新這筆" : "-";
}

/* 兼容保留（其他地方可能呼叫） */
function updateDepartmentUI(){
  forceRefreshDeptBlocks();
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

function ratioOrNull(plan, actual){
  const p = n0(plan);
  if (p <= 0) return null; // 未填寫或 0：不納入
  return n0(actual) / p;
}
function calcTeachingPerformance(planCounsel, actualCounsel, planRx, actualRx, planReport, actualReport, clubLeaveCount){
  const ratios = [
    ratioOrNull(planCounsel, actualCounsel),
    ratioOrNull(planRx, actualRx),
    ratioOrNull(planReport, actualReport),
  ].filter(v => v !== null && Number.isFinite(v));

  let base = 0;
  if (ratios.length){
    const avgRatio = ratios.reduce((s,v)=>s+v,0) / ratios.length;
    base = avgRatio * 100;
  }

  const leave = i0(clubLeaveCount);
  const penalty = leave > 1 ? (leave - 1) * 5 : 0;

  return clamp(base - penalty, 0, 999999);
}

/* Teacher: 出勤30 / 工作40 / 教學表現30 */
function calcTeacherTotal(att, work, counseling){
  return clamp(att*0.3 + work*0.4 + counseling*0.3, 0, 100);
}

/* Marketing: 出勤30 / 工作30 / 行銷40（鼓勵超額） */
function calcMarketingPerformance(target, actual, seminarCount){
  if (target <= 0) return 0;

  const ratio = actual / target;
  let listScore = 0;

  if (ratio <= 1){
    listScore = ratio * 75;
  } else if (ratio <= 1.5){
    listScore = 75 + ((ratio - 1) / 0.5) * 10; // +0~10
  } else {
    listScore = 85;
  }

  let bonus = 0;
  if (seminarCount === 1) bonus = 5;
  else if (seminarCount === 2) bonus = 10;
  else if (seminarCount >= 3) bonus = 15;

  return clamp(listScore + bonus, 0, 100);
}
function calcMarketingTotal(att, work, perf){
  return clamp(att*0.3 + work*0.3 + perf*0.4, 0, 100);
}

/* Planner: 出勤30 / 工作30 / 業績40（依營收加權，不封頂） */
function calcPlannerPerformance(courseRevenue, tripRevenue, targetPerPerson){
  const target = n0(targetPerPerson);
  if (target <= 0) return 0;

  const effective = n0(courseRevenue) * 1 + n0(tripRevenue) * 0.8;
  const ratio = effective / target;
  return clamp(ratio * 100, 0, 999999);
}
function calcPlannerTotal(att, work, perf){
  return clamp(att*0.3 + work*0.3 + perf*0.4, 0, 999999);
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

function countFridaysInMonth(rocYear, month){
  const y = i0(rocYear) + 1911;
  const m = clamp(i0(month), 1, 12);
  const days = new Date(y, m, 0).getDate(); // last day of month
  let c = 0;
  for (let d=1; d<=days; d++){
    const wd = new Date(y, m-1, d).getDay(); // 0 Sun ... 5 Fri
    if (wd === 5) c++;
  }
  return c;
}
function updateCleanRequiredUI(){
  if (!elCleanRequiredText) return;
  const y = i0(elRocYear.value);
  const m = i0(elMonth.value);
  const need = countFridaysInMonth(y, m);
  elCleanRequiredText.textContent = String(need);
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
  loadRevenueSettingToUI();
  loadCostSettingToUI();
  updateCleanRequiredUI();
  render();
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
  const cleanCount = clamp(i0(elCleanCount?.value), 0, 999);

  const teachPlanCounsel = n0(document.getElementById("teachPlanCounsel").value);
  const teachActualCounsel = n0(document.getElementById("teachActualCounsel").value);
  const teachPlanRx = n0(document.getElementById("teachPlanRx").value);
  const teachActualRx = n0(document.getElementById("teachActualRx").value);
  const teachPlanReport = n0(document.getElementById("teachPlanReport").value);
  const teachActualReport = n0(document.getElementById("teachActualReport").value);
  const clubLeaveCount = clamp(i0(document.getElementById("clubLeaveCount").value), 0, 999);

  const mktTarget = n0(document.getElementById("mktTarget").value);
  const mktActual = n0(document.getElementById("mktActual").value);
  const mktSeminars = clamp(i0(document.getElementById("mktSeminars").value), 0, 999);

  const plnCourseRevenue = n0(document.getElementById("plnCourseRevenue").value);
  const plnTripRevenue = n0(document.getElementById("plnTripRevenue").value);

  return {
    name, dept,
    personalLeave, sickLeave, annualLeave, officialLeave,
    workScore,
    cleanCount,

    teachPlanCounsel, teachActualCounsel,
    teachPlanRx, teachActualRx,
    teachPlanReport, teachActualReport,
    clubLeaveCount,

    mktTarget, mktActual, mktSeminars,
    plnCourseRevenue, plnTripRevenue
  };
}

/* ✅ 修正：編輯時「先設部門」→「強制刷新部門專項區塊」→ 再填值 */
function fillFormFromRecord(r){
  editingId = r.id;

  document.getElementById("name").value = r.name || "";

  elDept.value = r.dept || "課程規劃部門";
  forceRefreshDeptBlocks();

  document.getElementById("leavePersonal").value = r.personalLeave ?? "";
  document.getElementById("leaveSick").value = r.sickLeave ?? "";
  document.getElementById("leaveAnnual").value = r.annualLeave ?? "";
  document.getElementById("leaveOfficial").value = r.officialLeave ?? "";

  document.getElementById("workScore").value = r.workScore ?? "";
  if (elCleanCount) elCleanCount.value = r.cleanCount ?? "";

  document.getElementById("teachPlanCounsel").value = r.teachPlanCounsel ?? "";
  document.getElementById("teachActualCounsel").value = r.teachActualCounsel ?? "";
  document.getElementById("teachPlanRx").value = r.teachPlanRx ?? "";
  document.getElementById("teachActualRx").value = r.teachActualRx ?? "";
  document.getElementById("teachPlanReport").value = r.teachPlanReport ?? "";
  document.getElementById("teachActualReport").value = r.teachActualReport ?? "";
  document.getElementById("clubLeaveCount").value = r.clubLeaveCount ?? "";

  document.getElementById("mktTarget").value = r.mktTarget ?? "";
  document.getElementById("mktActual").value = r.mktActual ?? "";
  document.getElementById("mktSeminars").value = r.mktSeminars ?? "";

  document.getElementById("plnCourseRevenue").value = r.plnCourseRevenue ?? "";
  document.getElementById("plnTripRevenue").value = r.plnTripRevenue ?? "";

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
  if (elCleanCount) elCleanCount.value = "";

  document.getElementById("teachPlanCounsel").value = "";
  document.getElementById("teachActualCounsel").value = "";
  document.getElementById("teachPlanRx").value = "";
  document.getElementById("teachActualRx").value = "";
  document.getElementById("teachPlanReport").value = "";
  document.getElementById("teachActualReport").value = "";
  document.getElementById("clubLeaveCount").value = "";
  document.getElementById("mktTarget").value = "";
  document.getElementById("mktActual").value = "";
  document.getElementById("mktSeminars").value = "";
  document.getElementById("plnCourseRevenue").value = "";
  document.getElementById("plnTripRevenue").value = "";

  if (resetDept){
    elDept.value = "課程規劃部門";
  }

  forceRefreshDeptBlocks();
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
    cleanCount: clamp(i0(raw.cleanCount ?? raw.clean ?? raw.整潔 ?? raw.整潔次數), 0, 999),

    teachPlanCounsel: n0(raw.teachPlanCounsel ?? raw.預計諮商次數 ?? raw.諮商預計),
    teachActualCounsel: n0(raw.teachActualCounsel ?? raw.實際諮商次數 ?? raw.諮商實際),
    teachPlanRx: n0(raw.teachPlanRx ?? raw.預計處方箋 ?? raw.處方箋預計),
    teachActualRx: n0(raw.teachActualRx ?? raw.實際處方箋 ?? raw.處方箋實際),
    teachPlanReport: n0(raw.teachPlanReport ?? raw.預計分析書 ?? raw.分析書預計),
    teachActualReport: n0(raw.teachActualReport ?? raw.實際分析書 ?? raw.分析書實際),
    clubLeaveCount: clamp(i0(raw.clubLeaveCount ?? raw.聚樂部請假次數 ?? raw.聚樂部請假), 0, 999),


    mktTarget: n0(raw.mktTarget ?? raw.名單目標),
    mktActual: n0(raw.mktActual ?? raw.名單實際),
    mktSeminars: clamp(i0(raw.mktSeminars ?? raw.講座場次), 0, 999),

    plnCourseRevenue: n0(raw.plnCourseRevenue ?? raw.課程收入),
    plnTripRevenue: n0(raw.plnTripRevenue ?? raw.學旅收入),
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
function computeScores(rec, ctx = {}){
  const attendance = calcAttendance(rec.personalLeave, rec.sickLeave);
  const work = fiveToHundred(rec.workScore);

  const t = deptType(rec.dept);
  let thirdLabel = thirdLabelForDept(rec.dept);
  let third = 0;
  let total = 0;

  if (t === "TEACHER"){
    third = calcTeachingPerformance(
      rec.teachPlanCounsel, rec.teachActualCounsel,
      rec.teachPlanRx, rec.teachActualRx,
      rec.teachPlanReport, rec.teachActualReport,
      rec.clubLeaveCount
    );
    total = calcTeacherTotal(attendance, work, third);
  } else if (t === "MARKETING"){
    third = calcMarketingPerformance(rec.mktTarget, rec.mktActual, rec.mktSeminars);
    total = calcMarketingTotal(attendance, work, third);
  } else {
    const targetPerPerson = n0(ctx.plannerTargetPerPerson);
    third = calcPlannerPerformance(rec.plnCourseRevenue, rec.plnTripRevenue, targetPerPerson);
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
  }

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
      const monthList = list;
      const plannerCount = monthList.filter(r => deptType(r.dept) === "PLANNER").length;
      const rev = readRevenueSetting(pk);
      const targetPer = plannerCount ? (n0(rev.target) / (plannerCount + 1)) : 0;
      const s = computeScores(hit, { plannerTargetPerPerson: targetPer });
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
  const rev = readRevenueSetting();
  const plannerCount = list.filter(r => deptType(r.dept) === "PLANNER").length;
  const plannerTargetPerPerson = plannerCount ? (n0(rev.target) / (plannerCount + 1)) : 0;
  const ctx = { plannerTargetPerPerson };
  const y = i0(elRocYear.value);
  const m = i0(elMonth.value);

  const computed = list
    .map(r => ({ ...r, _score: computeScores(r, ctx) }))
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
        <th>部門專項</th>
        <th>部門專項分</th>
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

  // 依本月資料計算課程規劃師個人目標（固定包含老闆 1 人）
  const rev = readRevenueSetting();
  const plannerCount = list.filter(r => deptType(r.dept) === "PLANNER").length;
  const plannerTargetPerPerson = plannerCount ? (n0(rev.target) / (plannerCount + 1)) : 0;
  const ctx = { plannerTargetPerPerson };

  // 總營業額（給總覽用）：規劃師（原始）＋老闆（原始）
  const totalCourse = list.filter(r=>deptType(r.dept)==="PLANNER").reduce((s,r)=>s+n0(r.plnCourseRevenue),0) + n0(rev.bossCourse);
  const totalTrip = list.filter(r=>deptType(r.dept)==="PLANNER").reduce((s,r)=>s+n0(r.plnTripRevenue),0) + n0(rev.bossTrip);
  const totalRevenue = totalCourse + totalTrip;
  const reached = n0(rev.target) > 0 ? (totalRevenue >= n0(rev.target)) : false;

  // 公司費用（本月損益）
  const cost = readCostSetting();
  const fixedTotal = n0(cost.fixed?.rent) + n0(cost.fixed?.system) + n0(cost.fixed?.payroll) + n0(cost.fixed?.ads);
  const variableTotal = n0(cost.variable?.course) + n0(cost.variable?.trip) + n0(cost.variable?.teacherShare);
  const totalCost = fixedTotal + variableTotal;

  const profit = totalRevenue - totalCost;
  const revenueRate = n0(rev.target) > 0 ? (totalRevenue / n0(rev.target)) * 100 : 0;
  const profitRate = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // 主 KPI 顯示
  if (elKpiRevenue) elKpiRevenue.textContent = Math.round(totalRevenue).toLocaleString();
  if (elKpiRevenueRate) elKpiRevenueRate.textContent = Math.round(revenueRate) + "%";
  if (elKpiProfit) elKpiProfit.textContent = Math.round(profit).toLocaleString();
  if (elKpiProfitRate) elKpiProfitRate.textContent = Math.round(profitRate) + "%";

  // 動態顏色：達標率
  if (elKpiCardRevenueRate){
    elKpiCardRevenueRate.classList.remove("green","orange","red","purple");
    if (revenueRate >= 100) elKpiCardRevenueRate.classList.add("green");
    else if (revenueRate >= 80) elKpiCardRevenueRate.classList.add("orange");
    else elKpiCardRevenueRate.classList.add("red");
  }

  // 動態顏色：淨利率
  if (elKpiCardProfitRate){
    elKpiCardProfitRate.classList.remove("green","orange","red");
    if (profitRate > 20) elKpiCardProfitRate.classList.add("green");
    else if (profitRate >= 0) elKpiCardProfitRate.classList.add("orange");
    else elKpiCardProfitRate.classList.add("red");
  }

  elDeptList.innerHTML = "";
  elCardGrid.innerHTML = "";
  elTableBody.innerHTML = "";

  const computed = list
    .map(r => ({ ...r, _score: computeScores(r, ctx) }))
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
  if (!n){
    elAnalysisDesc.textContent = "本月尚無資料，請先新增。";
  } else {
    const revText = n0(rev.target) ? `｜總營業額 ${Math.round(totalRevenue)} / 目標 ${Math.round(n0(rev.target))}${reached ? "（達標）" : "（未達標）"}` : "";
    elAnalysisDesc.textContent = `分數為內部管理用，卡片不顯示分數。${revText}`;
  }
  elAvgAttendance.textContent = n ? String(avgAtt) : "-";
  elAvgWork.textContent = n ? String(avgWork) : "-";
  elAvgThird.textContent = n ? String(avgThird) : "-";

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

  computed.forEach((r)=>{
    const s = r._score;
    const info = s.gradeInfo;

    const R = 56;
    const C = 2 * Math.PI * R;

    const attPct = clamp(Math.round(s.attendance), 0, 100);
    const workPct = clamp(Math.round(s.work), 0, 100);
    const thirdPct = clamp(Math.round(s.third), 0, 100);
const cleanNeed = countFridaysInMonth(i0(elRocYear.value), i0(elMonth.value));
    const cleanDone = clamp(i0(r.cleanCount ?? 0), 0, 999);
    const cleanPct = cleanNeed > 0 ? clamp(Math.round((cleanDone / cleanNeed) * 100), 0, 100) : 0;

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
        <div class="meterRow">
          <div class="meterLabel">整潔</div>
          <div class="meterTrack"><div class="meterFill clean" style="width:${cleanPct}%"></div></div>
        </div>
      </div>

      <div class="empMeta">
        事假 ${r.personalLeave}h｜病假 ${r.sickLeave}h｜特休 ${r.annualLeave}h｜公假 ${r.officialLeave}h<br/>整潔 ${cleanDone} / ${cleanNeed}
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
      <td>${r.cleanCount ?? 0}</td>
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
  loadRevenueSettingToUI();
  loadCostSettingToUI();

  // ✅ 初始化時就做一次正確顯示
  forceRefreshDeptBlocks();

  render();
})();
