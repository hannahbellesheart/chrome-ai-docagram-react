const m=e=>{const o=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null),t=document.createElement("span");t.className="docagram-highlight";let a;const d=[];for(;a=o.nextNode();)d.push(a);d.forEach(n=>{var l;const i=n.textContent||"";if(i.includes(e)){const g=i.split(new RegExp(`(${e})`,"gi")),c=document.createDocumentFragment();g.forEach(r=>{if(r.toLowerCase()===e.toLowerCase()){const h=t.cloneNode();h.textContent=r,c.appendChild(h)}else c.appendChild(document.createTextNode(r))}),(l=n.parentNode)==null||l.replaceChild(c,n)}})},u=()=>{document.querySelectorAll(".docagram-highlight").forEach(e=>{var t;const o=e.textContent||"";(t=e.parentNode)==null||t.replaceChild(document.createTextNode(o),e)})};chrome.runtime.onMessage.addListener((e,o,t)=>(e.action==="highlight"&&(u(),m(e.entity),t({success:!0})),!0));const s=document.createElement("style");s.textContent=`
    .docagram-highlight {
      background-color: #fef08a;
      border-radius: 2px;
      transition: background-color 0.2s;
    }
    .docagram-highlight:hover {
      background-color: #fde047;
    }
  `;document.head.appendChild(s);
