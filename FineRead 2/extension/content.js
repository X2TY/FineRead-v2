// FineRead Content Script — extracts readable text from the current page
(function(){
  'use strict';

  // Listen for extract request from popup
  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if(msg.action === 'extractText'){
      respond({ text: extractPageText(), url: location.href, title: document.title });
    }
    if(msg.action === 'ping'){
      respond({ ok: true });
    }
  });

  function extractPageText(){
    // Clone body to avoid mutating page
    const clone = document.body.cloneNode(true);
    // Remove noise elements
    const remove = ['script','style','noscript','nav','header','footer','aside',
                    '[role="banner"]','[role="navigation"]','[role="complementary"]',
                    '.cookie-banner','.cookie-notice','#cookie-banner','.gdpr-banner'];
    remove.forEach(sel => {
      try{clone.querySelectorAll(sel).forEach(el=>el.remove());}catch{}
    });
    // Get inner text
    const text = (clone.innerText || clone.textContent || '')
      .replace(/\s{3,}/g, '\n\n')
      .trim();
    return text.slice(0, 100000); // cap at 100k chars
  }
})();
