const p=e=>e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),f=e=>{if(!e)return null;const t=p(e),o=new RegExp(`(${t})`,"gi"),n=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null),h=document.createElement("span");h.className="docagram-highlight";let s;const d=[];for(;s=n.nextNode();)d.push(s);let r=null;return d.forEach(c=>{const g=c.textContent||"";if(o.test(g)){const m=g.split(o),i=document.createDocumentFragment();m.forEach(a=>{if(a.toLowerCase()===e.toLowerCase()){const l=h.cloneNode();l.textContent=a,r||(r=l),i.appendChild(l)}else i.appendChild(document.createTextNode(a))}),c.parentNode&&c.parentNode.replaceChild(i,c)}}),r},C=()=>{document.querySelectorAll(".docagram-highlight").forEach(e=>{const t=e.textContent||"";e.parentNode&&e.parentNode.replaceChild(document.createTextNode(t),e)})};chrome.runtime.onMessage.addListener((e,t,o)=>{if(e.action==="highlight"){console.log("Highlighting",e.entity),C();const n=f(e.entity);n&&n.scrollIntoView({behavior:"smooth",block:"center"}),o({success:!0})}return!0});const u=document.createElement("style");u.textContent=`
  .docagram-highlight {
    background-color: #fef08a;
    border-radius: 2px;
    transition: background-color 0.2s;
  }
  .docagram-highlight:hover {
    background-color: #fde047;
  }
`;document.head.appendChild(u);
