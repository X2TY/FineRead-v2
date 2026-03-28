// FineRead Extension Popup Script
const FINEREAD_APP_URL = 'https://your-fineread-deployment.com'; // Update with your deployed URL

let pageText = '';
let pageUrl = '';

async function init(){
  // Load saved key
  const stored = await chrome.storage.local.get(['apiKey','rememberKey']);
  if(stored.rememberKey && stored.apiKey){
    document.getElementById('api-key-input').value = stored.apiKey;
    document.getElementById('remember-key-ext').checked = true;
  }

  // Try to get pending text from context menu
  const session = await chrome.storage.session.get(['pendingText','pendingUrl']);
  if(session.pendingText){
    pageText = session.pendingText;
    pageUrl = session.pendingUrl || '';
    chrome.storage.session.remove(['pendingText','pendingUrl']);
    showReady(pageText.length);
    return;
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if(tab) document.getElementById('page-title').textContent = tab.title || tab.url || '';

  // Try to extract text from page
  try{
    const resp = await chrome.tabs.sendMessage(tab.id, {action:'extractText'});
    if(resp?.text && resp.text.length > 50){
      pageText = resp.text;
      pageUrl = resp.url || '';
      showReady(pageText.length);
    } else {
      showManual();
    }
  }catch{
    showManual();
  }
}

function showReady(charCount){
  document.getElementById('status-area').innerHTML =
    `<div style="color:#34d399;margin-bottom:8px;">✅ ${charCount.toLocaleString()} characters extracted from page</div>
     <div style="color:#555;font-size:11.5px;">Ready to scan. Add an API key for full AI analysis.</div>`;
  document.getElementById('scan-btn').style.display='block';
  document.getElementById('key-section').style.display='flex';
  document.getElementById('open-app-btn').style.display='block';
}

function showManual(){
  document.getElementById('status-area').innerHTML =
    `<div style="color:#666;margin-bottom:8px;">Could not extract text automatically.</div>
     <div style="color:#555;font-size:11.5px;">Select text on the page, right-click, and choose "Scan with FineRead" — or open the full app.</div>`;
  document.getElementById('open-app-btn').style.display='block';
}

async function scanPage(){
  if(!pageText){ showManual(); return; }
  const btn = document.getElementById('scan-btn');
  const resultEl = document.getElementById('result-area');
  btn.innerHTML = '<span class="spinner"></span>Scanning…';
  btn.disabled = true;

  // Run basic keyword scan via postMessage to FineRead app in a hidden iframe
  // For the extension, we do a lightweight local scan
  const keywords = [
    {p:/\bbinding.*arbitration\b/i, label:'Mandatory arbitration', level:'danger'},
    {p:/\bclass\s+action\b/i, label:'Class action waiver', level:'danger'},
    {p:/\bperpetual.*irrevocable\b/i, label:'Perpetual license on content', level:'danger'},
    {p:/\bsell.*your.*personal.*information\b/i, label:'Data sold to third parties', level:'danger'},
    {p:/\bretain.*indefinitely\b/i, label:'Indefinite data retention', level:'danger'},
    {p:/\bautomatically\s+renew\b/i, label:'Auto-renewal subscription', level:'warning'},
    {p:/\bno\s+refund\b/i, label:'No refund policy', level:'warning'},
    {p:/\bterminate.*any\s+time\b/i, label:'Account terminated anytime', level:'warning'},
    {p:/\bat.will.*employ\b/i, label:'At-will employment', level:'warning'},
    {p:/\bnon.compete\b/i, label:'Non-compete clause', level:'warning'},
  ];

  const text = pageText;
  const flags = keywords.filter(k => k.p.test(text));
  const danger = flags.filter(f=>f.level==='danger');
  const warning = flags.filter(f=>f.level==='warning');
  let risk = 'low';
  if(danger.length >= 2 || (danger.length >= 1 && warning.length >= 2)) risk = 'high';
  else if(danger.length >= 1 || warning.length >= 2) risk = 'medium';

  const riskLabel = {high:'🔴 High Risk',medium:'🟡 Medium Risk',low:'🟢 Low Risk'}[risk];
  let html = `<div class="result-bar ${risk}">${riskLabel} · ${flags.length} flag${flags.length!==1?'s':''} found</div>`;
  if(flags.length){
    html += '<div class="tag-list">';
    flags.slice(0,6).forEach(f=>{
      html += `<span class="tag ${f.level}">${f.label}</span>`;
    });
    html += '</div>';
  }
  html += `<button class="open-btn" onclick="openWithText()">Open full analysis in FineRead →</button>`;
  resultEl.innerHTML = html;
  btn.innerHTML = '🔍 Scan this page';
  btn.disabled = false;

  // Save key if remember checked
  const key = document.getElementById('api-key-input').value.trim();
  const remember = document.getElementById('remember-key-ext').checked;
  if(remember && key) chrome.storage.local.set({apiKey:key,rememberKey:true});
  else if(!remember) chrome.storage.local.remove(['apiKey','rememberKey']);
}

function openFullApp(){
  chrome.tabs.create({url: FINEREAD_APP_URL});
}

async function openWithText(){
  // Store text then open FineRead — FineRead can read it from storage
  await chrome.storage.local.set({extensionText: pageText, extensionUrl: pageUrl});
  chrome.tabs.create({url: FINEREAD_APP_URL + '#ext'});
}

init();
