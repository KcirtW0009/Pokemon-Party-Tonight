'use client';
/** Secure-context Clipboard API, with a synchronous HTTP-compatible fallback. */
export async function copyText(text:string):Promise<boolean>{
 if(window.isSecureContext&&navigator.clipboard?.writeText){
  try{await navigator.clipboard.writeText(text);return true;}catch{/* Try the user-gesture fallback below. */}
 }
 const active=document.activeElement as HTMLElement|null,selection=document.getSelection(),ranges:Range[]=[];
 if(selection)for(let i=0;i<selection.rangeCount;i++)ranges.push(selection.getRangeAt(i).cloneRange());
 const textarea=document.createElement('textarea');textarea.value=text;textarea.readOnly=true;
 textarea.setAttribute('aria-hidden','true');textarea.style.cssText='position:fixed;top:0;left:-9999px;font-size:16px;';
 document.body.appendChild(textarea);
 try{textarea.focus({preventScroll:true});textarea.select();textarea.setSelectionRange(0,text.length);return document.execCommand('copy');}
 catch{return false;}
 finally{textarea.remove();active?.focus({preventScroll:true});if(selection){selection.removeAllRanges();for(const range of ranges)selection.addRange(range);}}
}

