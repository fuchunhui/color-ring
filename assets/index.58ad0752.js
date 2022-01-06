import{d as F,t as nt,o as f,c as y,F as L,r as x,n as N,a as E,u as v,b as $t,e as M,f as $,g as P,w as st,h as S,i as wt,j as Mt,k as Ct,l as G,m as O,p as D,q as C,s as kt,v as Rt,x as St,y as Bt,z as Pt,A as At,B as qt}from"./vendor.2f661ed8.js";const Et=function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&s(c)}).observe(document,{childList:!0,subtree:!0});function o(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerpolicy&&(r.referrerPolicy=n.referrerpolicy),n.crossorigin==="use-credentials"?r.credentials="include":n.crossorigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(n){if(n.ep)return;n.ep=!0;const r=o(n);fetch(n.href,r)}};Et();const Tt={class:"side"},Lt=["onClick"],Gt=F({props:{catalogList:null,current:null},emits:["change"],setup(e,{emit:t}){const s=nt(e).catalogList,n=r=>{t("change",r)};return(r,c)=>(f(),y("div",Tt,[(f(!0),y(L,null,x(v(s),({label:a,value:l})=>(f(),y("div",{key:l,class:N({"side-content":!0,"side-content-active":e.current===l}),onClick:u=>n(l)},E(a),11,Lt))),128))]))}});var Dt=(e,t)=>{const o=e.__vccOpts||e;for(const[s,n]of t)o[s]=n;return o};const Ht={},xt={class:"color-wrap"},jt=$t('<div class="logo"><a href="https://juejin.cn/post/7047529302140649486">Color Ring</a></div><div class="color-wrap-content"><p>\u8FD9\u662F\u4EC0\u4E48\uFF1F</p><p>\u6211\u60F3\u7528\u81EA\u5DF1\u7684\u65B9\u5F0F\uFF0C\u8BB2\u8BB2\u8272\u5F69\u7684\u4E16\u754C\uFF0C\u89C1\u8BC6\u4E0B\u795E\u5947\u7684\u989C\u8272\uFF0C\u628A\u90A3\u4E9B\u8BA9\u4EBA\u7740\u8FF7\u7684\u6570\u5B66\u6A21\u578B\uFF0C\u7ED3\u5408\u4E30\u5BCC\u7684\u8272\u5F69\u5C55\u793A\u51FA\u6765\u3002</p><p>\u4EC5\u4F5C\u4E3A\u4E2A\u4EBA\u5174\u8DA3\uFF0C\u4E0D\u5177\u6709\u4EFB\u4F55\u5B66\u672F\u6027\uFF0C\u5982\u679C\u6709\u4EFB\u4F55\u7455\u75B5\uFF0C\u8BF7\u4E00\u5B9A\u5E2E\u5FD9\u6307\u51FA\uFF0C\u975E\u5E38\u611F\u8C22\u3002</p></div><div class="color-wrap-footer"> \u66F4\u591A\u4ECB\u7ECD\u5185\u5BB9 <a href="https://juejin.cn/column/7047522560166068254">\u795E\u5947\u7684\u989C\u8272</a></div>',3),Wt=[jt];function It(e,t){return f(),y("div",xt,Wt)}var Nt=Dt(Ht,[["render",It]]);class w{constructor(t=[0,0,0],o=1){if(this._rgb=[0,0,0],this._alpha=0,Array.isArray(t))this._rgb=t;else{const s=t.match(/^#/g)?t.slice(1):t,n=[],r=s.length>=6?s.match(/.{2}/g):s.split("");r==null||r.forEach((c,a)=>{const l=parseInt(s.length>=6?c:c+c,16);a<3?n.push(l):this._alpha=l/255}),this._rgb=n}this._alpha=this._alpha||(typeof o=="number"?o:1)}rgb(){return this._rgb}rgba(){const{0:t,1:o,2:s}=this.rgb();return{r:t,g:o,b:s,a:this.alpha()}}alpha(){return this._alpha}toRGB(){return this.toHex(this._rgb)}toRGBA(){return this.toHex(this._rgb.concat([this._alpha*255]))}toHex(t=this._rgb){const o=[];return t.forEach(s=>{const n=Math.min(Math.max(Math.round(s),0),255);o.push(n.toString(16).padStart(2,"0"))}),`#${o.join("").toLowerCase()}`}toHSL(){const{0:t,1:o,2:s}=this._rgb,n=Math.max(t,o,s),r=Math.min(t,o,s),c=(n+r)/2/255,a=n-r;let l=0,u=0;if(n===r)u=0,l=0;else switch(l=c>.5?a/(2*255-n-r):a/(n+r),n){case t:u=(o-s)/a*60;break;case o:u=(s-t)/a*60+120;break;case s:u=(t-o)/a*60+240;break}return u<0&&(u+=360),{h:Math.round(u),s:l,l:Math.ceil(c*1e3)/1e3,a:this._alpha}}toHSV(){const{0:t,1:o,2:s}=this._rgb,n=Math.max(t,o,s),r=Math.min(t,o,s),c=Math.ceil(n/255*1e3)/1e3,a=n-r,l=n===0?0:a/n;let u=0;if(n===r)u=0;else switch(n){case t:u=(o-s)/a*60;break;case o:u=(s-t)/a*60+120;break;case s:u=(t-o)/a*60+240;break}return u<0&&(u+=360),{h:Math.round(u),s:l,v:c,a:this._alpha}}toCMYK(){const{0:t,1:o,2:s}=this._rgb,n=Math.max(t,o,s)/255;if(n===0)return{c:0,m:0,y:0,k:1};const r=1-n,c=(n-t/255)/n,a=(n-o/255)/n,l=(n-s/255)/n;return{c,m:a,y:l,k:r}}}const Ot={class:"color-detail"},Ut={class:"color-detail-table"},Vt={class:"color-detail-title"},Yt={class:"color-detail-code"},Kt=F({props:{color:null},setup(e){const o=nt(e).color,s=M(()=>o.value.toHex().toUpperCase()),n=M(()=>o.value.rgb().join(", ")),r=M(()=>{const d=[];return o.value.rgb().forEach(i=>{const p=Math.round(i*100/255);d.push(`${p}%`)}),d.join(", ")}),c=M(()=>{const{h:d,s:i,l:p}=o.value.toHSL();return[d,`${i*100}%`,`${p*100}`].join(", ")}),a=M(()=>{const{h:d,s:i,v:p}=o.value.toHSV();return[`${d}\xB0`,`${i*100}`,`${p*100}`].join(", ")}),l=M(()=>{const{c:d,m:i,y:p,k:_}=o.value.toCMYK();return`${d*100}, ${i*100}, ${p*100}, ${_}`}),u=M(()=>[{label:"Hex triplet",code:s.value},{label:"RGB Decimal",code:`rgb(${n.value})`},{label:"RGB Percent",code:`rgb(${r.value})`},{label:"CMYK",code:l.value},{label:"HSL",code:`hsl(${c.value})`},{label:"HSV(or HSB)",code:a.value}]);return(d,i)=>(f(),y("div",Ot,[$("table",Ut,[$("tbody",null,[(f(!0),y(L,null,x(v(u),({label:p,code:_},b)=>(f(),y("tr",{key:b},[$("th",Vt,E(p),1),$("td",Yt,[$("code",null,E(_),1)])]))),128))])])]))}});const Xt={class:"color-list"},Jt={class:"color-list-wrap"},Qt=["onClick"],Zt=F({props:{colors:null,color:null},setup(e){const t=e,o=P(t.color),s=n=>{o.value=n};return st(()=>t.color,n=>{o.value=n},{deep:!0}),(n,r)=>(f(),y("div",Xt,[S(Kt,{color:o.value},null,8,["color"]),$("div",Jt,[(f(!0),y(L,null,x(e.colors,(c,a)=>(f(),y("div",{key:a,class:N({"color-cell":!0,"color-cell-active":e.color.toHex()===c.toHex()}),style:wt({backgroundColor:c.toRGB()}),onClick:l=>s(c)},E(c.toRGB().toUpperCase()),15,Qt))),128))])]))}}),zt=(e,t,o)=>{const n=`image/${["jpeg","jpg"].includes(t)?"jpeg":"png"}`,r=e.toDataURL(n),c=document.createElement("a");c.setAttribute("download",o),c.setAttribute("href",r),c.setAttribute("target","_blank"),c.click()};const to=F({props:{label:{type:String,default:"\u63D0\u4EA4"},disabled:{type:Boolean,default:!1}},setup(e){return(t,o)=>(f(),y("button",{class:N(["color-button",{disabled:e.disabled}])},[Mt(t.$slots,"default",{},()=>[Ct(E(e.label),1)])],2))}});const oo={class:"base-canvas"},k=F({props:{beforeConvert:{type:Function,default:()=>{}},convert:{type:Function,default:()=>{}},afterConvert:{type:Function,default:()=>{}},colors:{type:Array,default:()=>[]}},setup(e){const t=e;G(_=>({"34930678":a}));const o=P(null),{width:s,height:n}=O("rank");let r=document.createElement("canvas");const c=390,a=`${c}px`,l=P(new w),u=()=>{r=o.value,r.width=s-c,r.height=n;const _=r.getContext("2d");t.beforeConvert(_),t.convert(_),t.afterConvert(_)},d=_=>{const b=I=>I.toString(16).padStart(2,"0"),{0:R,1:B,2:T,3:q}=_.data;return`#${b(R)}${b(B)}${b(T)}${b(q)}`.toUpperCase()},i=_=>{const{offsetX:b,offsetY:R}=_;if(b<0||R<0)return;const T=r.getContext("2d").getImageData(b,R,1,1),q=d(T);l.value=new w(q),navigator.clipboard.writeText(q)},p=()=>{zt(r,"png","nannn")};return D(()=>{u()}),(_,b)=>(f(),y("div",oo,[$("canvas",{class:"base-canvas-center",ref_key:"canvasRef",ref:o,onClick:i},null,512),S(Zt,{colors:e.colors,color:l.value},null,8,["colors","color"]),S(v(to),{class:"download",u:"primary",label:"\u4E0B\u8F7D",onClick:p})]))}}),j=120,A=100,eo=(e,t,o)=>[{x:A+j/2,y:A,color:e},{x:A,y:A+Math.sqrt(3)*j/2,color:t},{x:A+j,y:A+Math.sqrt(3)*j/2,color:o}],rt=(e,t,o,s)=>{eo(e,t,o).forEach(({x:r,y:c,color:a})=>{s.beginPath(),s.arc(r,c,A,0,2*Math.PI),s.fillStyle=a,s.fill()})},ct="#FF0000",at="#00FF00",lt="#0000FF",no="#ffff00",so="#00ffff",ro="#ff00ff",co="#FFFFFF",ao=[ct,no,at,so,lt,ro,co],lo=ao.map(e=>new w(e)),io=e=>{e.globalCompositeOperation="screen",rt(ct,at,lt,e)},uo=F({setup(e){return(t,o)=>(f(),C(k,{convert:v(io),colors:v(lo)},null,8,["convert","colors"]))}}),it="#FF0000",ut="#00FF00",ht="#0000FF",ho="#ffff00",_o="#00ffff",po="#ff00ff",fo="#FFFFFF",mo=[it,ho,ut,_o,ht,po,fo],vo=mo.map(e=>new w(e)),go=e=>{const{width:t,height:o}=O("rank");e.globalCompositeOperation="difference",rt(it,ut,ht,e),e.beginPath(),e.fillStyle="white",e.fillRect(0,0,t,o)},Fo=F({setup(e){return(t,o)=>(f(),C(k,{convert:v(go),colors:v(vo)},null,8,["convert","colors"]))}});const yo=20,bo=200,$o=10,U=(e,t=1,o,s)=>{var i,p;if(!e.length||t<1)return;const n=(i=s==null?void 0:s.width)!=null?i:yo,r=(p=s==null?void 0:s.minr)!=null?p:bo,c=r+n*t+$o,a=c,l=2*Math.PI/e.length,u=(Math.PI+l)/2;o.lineWidth=n;const d=_=>{e.forEach((b,R)=>{const B=R*l-u,T=B+l,q=1-.1*(_-1),I=r+n*(t-_),bt=new w(b.rgb(),q);o.beginPath(),o.strokeStyle=bt.toRGBA(),o.arc(c,a,I,B,T),o.stroke(),o.closePath()})};for(let _=1;_<=t;_++)d(_)},wo=["#FF0000","#FF8000","#FFFF00","#80FF00","#00FF00","#00FF80","#00FFFF","#0080FF","#0000FF","#8000FF","#FF00FF","#FF0080"],_t=wo.map(e=>new w(e)),Mo=e=>{U(_t,1,e,{minr:200,width:40})},Co=F({setup(e){return(t,o)=>(f(),C(k,{convert:v(Mo),colors:v(_t)},null,8,["convert","colors"]))}}),V=(e,t,o=.5)=>{const{r:s,g:n,b:r,a:c}=e.rgba(),{r:a,g:l,b:u,a:d}=t.rgba(),i=o*2-1,p=c-d,_=((i*p==-1?i:(i+p)/(1+i*p))+1)/2,b=1-_,R=[Math.round(s*_+a*b),Math.round(n*_+l*b),Math.round(r*_+u*b)],B=c*o+d*(1-o);return new w(R,B)},Y=(e,t=1,o=V)=>{const s=e.length;if(t<1||s<2)return e;const n=.5,r=[];return e.forEach((c,a)=>{r.push(c);const l=a+1<s?a+1:0;if(l!==a-1){const u=o(c,e[l],n);r.push(u)}}),t--,t?Y(r,t,o):r},ko=(e,t,o)=>Ro(e,t,o,1),Ro=(e,t,o,s)=>{let n=0,r=0,c=0;if(t===0)n=o,r=o,c=o;else{const a=o<.5?o*(1+t):o+t-o*t,l=2*o-a,u=e/360,d=i=>{i<0?i=i+1:i>1&&(i=i-1);let p=0;return i<1/6?p=l+(a-l)*6*i:i<1/2?p=a:i<2/3?p=l+(a-l)*6*(2/3-i):p=l,p};n=d(u+1/3),r=d(u),c=d(u-1/3)}return new w([n*255,r*255,c*255],s)},So="#FF0000",Bo="#00FF00",Po="#0000FF",Ao="#ffff00",qo="#00ffff",Eo="#ff00ff",To=[So,Ao,Bo,qo,Po,Eo],Lo=To.map(e=>new w(e)),pt=Y(Lo,3,V),Go=e=>{const{width:t,height:o}=O("rank");e.beginPath(),e.fillStyle="transparent",e.fillRect(0,0,t,o),U(pt,1,e,{minr:200,width:40})},Do=F({setup(e){return(t,o)=>(f(),C(k,{convert:v(Go),colors:v(pt)},null,8,["convert","colors"]))}}),Ho="#FF0000",xo="#00FF00",jo="#0000FF",Wo="#ffff00",Io="#00ffff",No="#ff00ff",Oo=[Ho,Wo,xo,Io,jo,No],Uo=Oo.map(e=>new w(e)),ft=Y(Uo,4,V),Vo=e=>{U(ft,10,e,{minr:160,width:20})},Yo=F({setup(e){return(t,o)=>(f(),C(k,{convert:v(Vo),colors:v(ft)},null,8,["convert","colors"]))}}),Ko=["#FFFF00","#FFAA00","#FF8000","#FF5500","#FF0000","#FF0080","#FF00FF","#8080FF","#0080FF","#00FFFF","#00FF00","#80FF00"],H=Ko.map(e=>new w(e)),K=40,X=200,Xo=10,m=X+K+Xo,g=m,J=2*Math.PI/H.length,h=X-K/2,Jo=(e,t)=>{const o=(Math.PI+J)/2;t.lineWidth=K,e.forEach((s,n)=>{const r=n*J-o,c=r+J;t.beginPath(),t.strokeStyle=s.toRGBA(),t.arc(m,g,X,r,c),t.stroke(),t.closePath()})},Qo=(e,t)=>{const[o,s,n]=e;t.lineWidth=1,t.beginPath(),t.fillStyle=o.toRGBA(),t.moveTo(m,g),t.lineTo(m-h*Math.sqrt(3)/4,g-h/4),t.lineTo(m,g-h),t.lineTo(m+h*Math.sqrt(3)/4,g-h/4),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.moveTo(m,g),t.lineTo(m+h*Math.sqrt(3)/4,g-h/4),t.lineTo(m+h*Math.sqrt(3)/2,g+h/2),t.lineTo(m,g+h/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=n.toRGBA(),t.moveTo(m,g),t.lineTo(m-h*Math.sqrt(3)/4,g-h/4),t.lineTo(m-h*Math.sqrt(3)/2,g+h/2),t.lineTo(m,g+h/2),t.fill(),t.closePath()},Zo=(e,t)=>{const[o,s,n]=e;t.lineWidth=1,t.beginPath(),t.fillStyle=o.toRGBA(),t.lineTo(m,g-h),t.lineTo(m+h*Math.sqrt(3)/2,g+h/2),t.lineTo(m+h*Math.sqrt(3)/2,g-h/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.lineTo(m+h*Math.sqrt(3)/2,g+h/2),t.lineTo(m-h*Math.sqrt(3)/2,g+h/2),t.lineTo(m,g+h),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=n.toRGBA(),t.lineTo(m-h*Math.sqrt(3)/2,g+h/2),t.lineTo(m,g-h),t.lineTo(m-h*Math.sqrt(3)/2,g-h/2),t.fill(),t.closePath()},zo=e=>{Jo(H,e),Qo(H.filter((t,o)=>[0,4,8].includes(o)),e),Zo(H.filter((t,o)=>[2,6,10].includes(o)),e)},te=F({setup(e){return(t,o)=>(f(),C(k,{class:"itten",convert:v(zo),colors:v(H)},null,8,["convert","colors"]))}}),oe=(e,t,o)=>[{x:e+o/2,y:t-o*Math.sqrt(3)/2},{x:e+o,y:t},{x:e+o/2,y:t+o*Math.sqrt(3)/2},{x:e-o/2,y:t+o*Math.sqrt(3)/2},{x:e-o,y:t},{x:e-o/2,y:t-o*Math.sqrt(3)/2}],ee=(e,t,o,s=1)=>{if(s===0)return[{x:e,y:t}];const n=[],r=[],c=[],a=[],l=[],u=[];for(let i=1;i<=s;i++)n.push({x:e+i*o*3/2,y:t-s*o*Math.sqrt(3)+i*o*Math.sqrt(3)/2}),r.push({x:e+s*o*3/2,y:t+s*o*Math.sqrt(3)/2-(s-i)*o*Math.sqrt(3)}),c.push({x:e+(s-i)*o*3/2,y:t+s*o*Math.sqrt(3)-(s-i)*o*Math.sqrt(3)/2}),a.push({x:e-i*o*3/2,y:t+s*o*Math.sqrt(3)-i*o*Math.sqrt(3)/2}),l.push({x:e-s*o*3/2,y:t+s*o*Math.sqrt(3)/2-i*o*Math.sqrt(3)}),u.push({x:e-(s-i)*o*3/2,y:t-s*o*Math.sqrt(3)+(s-i)*o*Math.sqrt(3)/2});return n.concat(r,c,a,l,u)},Q=(e,t,o,s=1)=>{let n=[];for(let r=0;r<=s;r++){const c=ee(e,t,o,r);n=n.concat(c)}return n},Z=(e,t,o,s,n)=>{const r=oe(e,t,o);n.beginPath(),r.forEach(({x:c,y:a},l)=>{l===0?n.moveTo(c,a):n.lineTo(c,a)}),n.fillStyle=s.toRGBA(),n.fill(),n.closePath()},z=(e=1)=>new Array(e).fill("").map((s,n)=>(n+1)*6).reduce((s,n)=>s+n,1),ne=(e,t,o,s=1,n,r)=>{Q(e,t,o,s).forEach(({x:a,y:l},u)=>{const d="#"+Math.floor(Math.random()*16777215).toString(16),i=n[u]||new w(d);Z(a,l,o,i,r)})},se=(e,t,o,s=1,n)=>{const r=(s+1)*o*Math.sqrt(3);n.beginPath(),[{x:e+r*Math.sqrt(3)/2,y:t-r/2},{x:e+r*Math.sqrt(3)/2,y:t+r/2},{x:e,y:t+r},{x:e-r*Math.sqrt(3)/2,y:t+r/2},{x:e-r*Math.sqrt(3)/2,y:t-r/2},{x:e,y:t-r}].forEach(({x:a,y:l},u)=>{u===0?n.moveTo(a,l):n.lineTo(a,l)}),n.fillStyle="#000000",n.fill(),n.closePath()},re=(e,t,o=1,s)=>{const n=(1+o*Math.sqrt(3))*t+t,r=n;se(n,r,t,o,s),Q(n,r,t,o).forEach(({x:a,y:l},u)=>{Z(a,l,t,e[u],s)})},dt=8,ce=z(dt);let W=[];for(let e=0;e<ce;e++){const t=Math.floor(Math.random()*4095);W.push(t)}W=W.sort((e,t)=>t-e);const mt=W.map(e=>new w(`#${e.toString(16).padStart(3,"0")}`)),ae=e=>{re(mt,25,dt,e)},le=F({setup(e){return(t,o)=>(f(),C(k,{convert:v(ae),colors:v(mt)},null,8,["convert","colors"]))}}),ie=e=>{const t=[];for(let o=1;o<=e;o++)t.push(o);return t},ue=(e,t)=>{const o=ie(e),s=[];let n=1;for(;o.length>0;){const r=[];for(let c=0;c<Math.min(n,t)&&o.length!==0;c++){const a=Math.floor(Math.random()*o.length);r.push(o[a]-1),o.splice(a,1)}s.push(r),n++}return s},he=(e,t,o,s,n)=>{s.forEach(({x:r,y:c})=>{const a="#"+Math.floor(Math.random()*16777215).toString(16);vt.push(new w(a)),Z(r,c,o,new w(a),n)})},vt=[],tt=10,_e=z(tt),pe=ue(_e,6),fe=100,de=e=>{const t=20,o=(1+tt*Math.sqrt(3))*t+t,s=o,n=Q(o,s,t,tt);pe.forEach((r,c)=>{setTimeout(()=>{const a=r.map(l=>n[l]);he(o,s,t,a,e)},c*fe)})},me=F({setup(e){const t=M(()=>vt);return(o,s)=>(f(),C(k,{convert:v(de),colors:v(t)},null,8,["convert","colors"]))}}),ve=(e,t,o=1,s)=>{const n=(1+o*Math.sqrt(3))*t+t;ne(n,n,t,o,e,s)},ot=[],gt=15,ge=z(gt);for(let e=0;e<ge;e++)ot.push(ko(e,1,.5));const Fe=e=>{ve(ot,10,gt,e)},ye=F({setup(e){return(t,o)=>(f(),C(k,{convert:v(Fe),colors:v(ot)},null,8,["convert","colors"]))}}),et=(e,t,o)=>{const s=document.createElement("canvas");s.width=e*2,s.height=e*2;const n=s.getContext("2d");return n.fillStyle=t,n.fillRect(0,0,e,e),n.fillStyle=o,n.fillRect(e,0,e,e),n.fillStyle=o,n.fillRect(0,e,e,e),n.fillStyle=t,n.fillRect(e,e,e,e),n.createPattern(s,"repeat"),s.toDataURL()};const be={class:"composite-cell"},$e={class:"composite-cell-title"},we=F({props:{operator:null,white:{type:Boolean}},setup(e){const t=e;G(c=>({"9ee6f484":n}));const o=P(null),s=160,n=`${s}px`,r=()=>{const c=o.value;c.width=s,c.height=s;const a=c.getContext("2d"),l=et(8,"#FFF","#EEE");c.style.background=`url(${l})`,t.white&&(a.fillStyle="white",a.fillRect(0,0,s,s)),a.globalCompositeOperation=t.operator,a.fillStyle="red",a.fillRect(10,10,100,100),a.fillStyle="blue",a.fillRect(50,50,100,100)};return D(()=>{r()}),(c,a)=>(f(),y("div",be,[$("p",$e,E(e.operator),1),$("canvas",{ref_key:"canvasRef",ref:o},null,512)]))}});const Me={class:"composite-source"},Ce=$("p",{class:"composite-source-title"}," source ",-1),ke=F({setup(e){G(r=>({"08389cbe":s}));const t=P(null),o=160,s=`${o}px`,n=()=>{const r=t.value;r.width=o,r.height=o;const c=r.getContext("2d"),a=et(8,"#FFF","#EEE");r.style.background=`url(${a})`,c.fillStyle="red",c.fillRect(10,10,100,100)};return D(()=>{n()}),(r,c)=>(f(),y("div",Me,[Ce,$("canvas",{ref_key:"canvasRef",ref:t},null,512)]))}});const Re={class:"composite-destination"},Se=$("p",{class:"composite-destination-title"}," destination ",-1),Be=F({setup(e){G(r=>({"427d66ae":s}));const t=P(null),o=160,s=`${o}px`,n=()=>{const r=t.value;r.width=o,r.height=o;const c=r.getContext("2d"),a=et(8,"#FFF","#EEE");r.style.background=`url(${a})`,c.fillStyle="blue",c.fillRect(50,50,100,100)};return D(()=>{n()}),(r,c)=>(f(),y("div",Re,[Se,$("canvas",{ref_key:"canvasRef",ref:t},null,512)]))}});const Pe={class:"compositing"},Ae={class:"compositing-title"},qe={class:"compositing-item"},Ee=F({setup(e){const t=["clear","copy","source-over","destination-over","source-in","destination-in","source-out","destination-out","source-atop","destination-atop","xor","lighter"],o=[!0,!0,!0,!0,!0,!0,!0,!0,!0,!0,!0,!0];return(s,n)=>(f(),y("div",Pe,[$("div",Ae,[S(ke),S(Be)]),$("div",qe,[(f(),y(L,null,x(t,(r,c)=>S(we,{key:r,operator:r,white:o[c]},null,8,["operator","white"])),64))])]))}}),Ft=[{path:"/",name:"home",label:"\u8272\u5F69\u7684\u4E16\u754C",component:Nt},{path:"/rgb",name:"rgb",label:"\u5149\u7684\u4E09\u539F\u8272\uFF08RGB\u6A21\u578B\uFF09",component:uo},{path:"/cmyk",name:"cmyk",label:"\u5370\u5237\u56DB\u8272\uFF08CMYK\u6A21\u578B\uFF09",component:Fo},{path:"/twelve",name:"twelve",label:"\u5341\u4E8C\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:Co},{path:"/fortyeight",name:"fortyeight",label:"\u56DB\u5341\u516B\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:Do},{path:"/ninetysix",name:"ninetysix",label:"\u4E5D\u5341\u516D\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:Yo},{path:"/itten",name:"itten",label:"\u4F0A\u767B\u5341\u4E8C\u8272\u73AF\uFF08RYB\u6A21\u578B\uFF09",component:te},{path:"/palette",name:"palette",label:"\u8C03\u8272\u677F",component:le},{path:"/random",name:"random",label:"\u563F\uFF0C\u52A8\u8D77\u6765",component:me},{path:"/progress",name:"progress",label:"\u6E10\u8FDB\u5F0F\u7684\u8C03\u8272\u677F",component:ye},{path:"/compositing",name:"compositing",label:"\u6DF7\u5408\uFF08Compositing\uFF09",component:Ee}],yt=[];Ft.forEach(({label:e,name:t})=>{e&&t&&yt.push({label:e,value:t.toUpperCase()})});const Te=kt({history:Rt(),routes:Ft});const Le=F({setup(e){G(i=>({de4ac442:a,e3b8717e:u}));const t=St(),o=Bt(),s=P("HOME"),n=i=>{s.value=i,t.push({name:i.toLowerCase()})},r=M(()=>o.name||"home");st(r,i=>{s.value=i.toUpperCase()});const c=180,a=`${c}px`,l=10,u=`${l}px`,d=()=>{const i=document.getElementById("app"),{width:p,height:_}=i.getBoundingClientRect();At("rank",{width:p-c-2*l,height:_-2*l})};return D(()=>{d()}),(i,p)=>{const _=Pt("router-view");return f(),y(L,null,[S(Gt,{current:s.value,"catalog-list":v(yt),onChange:n},null,8,["current","catalog-list"]),S(_,{class:"container"})],64)}}});qt(Le).use(Te).mount("#app");
