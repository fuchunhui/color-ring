import{d as g,t as U,o as v,c as y,F as S,r as D,u as m,n as K,a as A,b as T,e as w,f as j,g as E,w as z,h as L,i as ct,j as X,k as W,l as $,m as it,p as ut,q as ht,s as _t,v as pt,x as ft,y as Ft}from"./vendor.3aef3a48.js";const vt=function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function e(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerpolicy&&(r.referrerPolicy=n.referrerpolicy),n.crossorigin==="use-credentials"?r.credentials="include":n.crossorigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(n){if(n.ep)return;n.ep=!0;const r=e(n);fetch(n.href,r)}};vt();const dt={class:"side"},mt=["onClick"],gt=g({props:{catalogList:null,current:null},emits:["change"],setup(o,{emit:t}){const s=U(o).catalogList,n=r=>{t("change",r)};return(r,a)=>(v(),y("div",dt,[(v(!0),y(S,null,D(m(s),({label:l,value:c})=>(v(),y("div",{key:c,class:K({"side-content":!0,"side-content-active":o.current===c}),onClick:u=>n(c)},A(l),11,mt))),128))]))}});const yt={class:"color-wrap"},bt=w("p",null,"\u8FD9\u4E2A\u662F\u4EC0\u4E48\u5462",-1),Mt=[bt],wt=g({setup(o){return T(()=>{}),(t,e)=>(v(),y("div",yt,Mt))}});class b{constructor(t=[0,0,0],e=1){if(this._rgb=[0,0,0],this._alpha=0,Array.isArray(t))this._rgb=t;else{const s=t.match(/^#/g)?t.slice(1):t,n=[],r=s.length>=6?s.match(/.{2}/g):s.split("");r==null||r.forEach((a,l)=>{const c=parseInt(s.length>=6?a:a+a,16);l<3?n.push(c):this._alpha=c/255}),this._rgb=n}this._alpha=this._alpha||(typeof e=="number"?e:1)}rgb(){return this._rgb}rgba(){const{0:t,1:e,2:s}=this.rgb();return{r:t,g:e,b:s,a:this.alpha()}}alpha(){return this._alpha}toRGB(){return this.toHex(this._rgb)}toRGBA(){return this.toHex(this._rgb.concat([this._alpha*255]))}toHex(t=this._rgb){const e=[];return t.forEach(s=>{const n=Math.min(Math.max(Math.round(s),0),255);e.push(n.toString(16).padStart(2,"0"))}),`#${e.join("").toLowerCase()}`}toHSL(){const{0:t,1:e,2:s}=this._rgb,n=Math.max(t,e,s),r=Math.min(t,e,s),a=(n+r)/2/255,l=n-r;let c=0,u=0;if(n===r)u=0,c=0;else switch(c=a>.5?l/(2*255-n-r):l/(n+r),n){case t:u=(e-s)/l*60;break;case e:u=(s-t)/l*60+120;break;case s:u=(t-e)/l*60+240;break}return u<0&&(u+=360),{h:u,s:c,l:Math.ceil(a*1e3)/1e3,a:this._alpha}}toHSV(){const{0:t,1:e,2:s}=this._rgb,n=Math.max(t,e,s),r=Math.min(t,e,s),a=Math.ceil(n/255*1e3)/1e3,l=n-r,c=n===0?0:l/n;let u=0;if(n===r)u=0;else switch(n){case t:u=(e-s)/l*60;break;case e:u=(s-t)/l*60+120;break;case s:u=(t-e)/l*60+240;break}return u<0&&(u+=360),{h:u,s:c,v:a,a:this._alpha}}toHSVReal(){}}const Ct={class:"color-detail"},$t={class:"color-detail-table"},kt={class:"color-detail-title"},Bt={class:"color-detail-value"},qt={class:"color-detail-code"},Pt=g({props:{color:null},setup(o){const e=U(o).color,s=j(()=>[{label:"Hex triplet",value:e.value.toHex(),code:"#FF00FF"},{label:"RGB Decimal",value:e.value.rgb(),code:"123"},{label:"RGB Percent",value:"RGB Percent",code:"123"},{label:"CMYK",value:"CMYK",code:"123"},{label:"HSL",value:"HSL",code:"123"},{label:"HSV(or HSB)",value:"HSV",code:"123"}]);return(n,r)=>(v(),y("div",Ct,[w("table",$t,[w("tbody",null,[(v(!0),y(S,null,D(m(s),({label:a,value:l,code:c},u)=>(v(),y("tr",{key:u},[w("th",kt,A(a),1),w("td",Bt,A(l),1),w("td",qt,[w("code",null,A(c),1)])]))),128))])])]))}});const At={class:"color-list"},Rt={class:"color-list-wrap"},St=["onClick"],Tt=g({props:{colors:null,color:null},setup(o){const t=o,e=E(t.color),s=n=>{e.value=n};return z(()=>t.color,n=>{e.value=n},{deep:!0}),(n,r)=>(v(),y("div",At,[L(Pt,{color:e.value},null,8,["color"]),w("div",Rt,[(v(!0),y(S,null,D(o.colors,(a,l)=>(v(),y("div",{key:l,class:K({"color-cell":!0,"color-cell-active":o.color.toHex()===a.toHex()}),style:ct({backgroundColor:a.toRGB()}),onClick:c=>s(a)},A(a.toRGB().toUpperCase()),15,St))),128))])]))}});const Et={class:"base-canvas"},k=g({props:{beforeConvert:{type:Function,default:()=>{}},convert:{type:Function,default:()=>{}},afterConvert:{type:Function,default:()=>{}},colors:{type:Array,default:()=>[]}},setup(o){const t=o;X(_=>({"1815c35a":l}));const e=E(null),{width:s,height:n}=W("rank");let r=document.createElement("canvas");const a=500,l=`${a}px`,c=E(new b),u=()=>{r=e.value,r.width=s-a,r.height=n;const _=r.getContext("2d");t.beforeConvert(_),t.convert(_),t.afterConvert(_)},d=_=>{const p=H=>H.toString(16).padStart(2,"0"),{0:M,1:q,2:C,3:P}=_.data;return`#${p(M)}${p(q)}${p(C)}${p(P)}`.toUpperCase()},i=_=>{const{offsetX:p,offsetY:M}=_;if(p<0||M<0)return;const C=r.getContext("2d").getImageData(p,M,1,1),P=d(C);console.log("click----> ",P),c.value=new b(P)};return T(()=>{u()}),(_,p)=>(v(),y("div",Et,[w("canvas",{class:"base-canvas-center",ref_key:"canvasRef",ref:e,onClick:i},null,512),L(Tt,{colors:o.colors,color:c.value},null,8,["colors","color"])]))}}),G=120,B=100,Lt=(o,t,e)=>[{x:B+G/2,y:B,color:o},{x:B,y:B+Math.sqrt(3)*G/2,color:t},{x:B+G,y:B+Math.sqrt(3)*G/2,color:e}],I=(o,t,e,s)=>{Lt(o,t,e).forEach(({x:r,y:a,color:l})=>{s.beginPath(),s.arc(r,a,B,0,2*Math.PI),s.fillStyle=l,s.fill()})},J="#FF0000",Q="#00FF00",Z="#0000FF",Gt=[new b(J),new b(Q),new b(Z)],Ht=o=>{o.globalCompositeOperation="screen",I(J,Q,Z,o)};const Dt=g({setup(o){return(t,e)=>(v(),$(k,{class:"light",convert:m(Ht),colors:m(Gt)},null,8,["convert","colors"]))}}),Wt="#FF0000",It="#00FF00",Ot="#0000FF",Nt=o=>{const{width:t,height:e}=W("rank");o.globalCompositeOperation="difference",I(Wt,It,Ot,o),o.beginPath(),o.fillStyle="white",o.fillRect(0,0,t,e)};const Vt=g({setup(o){return(t,e)=>(v(),$(k,{class:"cmyk",convert:m(Nt)},null,8,["convert"]))}}),Yt="#FF0000",Ut="#00FF00",Kt="#0000FF",jt=o=>{const{width:t,height:e}=W("rank");o.globalCompositeOperation="difference",I(Yt,Ut,Kt,o),o.beginPath(),o.fillStyle="white",o.fillRect(0,0,t,e)};const zt=g({setup(o){return T(()=>{}),(t,e)=>(v(),$(k,{class:"art",convert:m(jt)},null,8,["convert"]))}}),Xt=20,Jt=200,Qt=10,x=(o,t=1,e,s)=>{var i,_;if(!o.length||t<1)return;const n=(i=s==null?void 0:s.width)!=null?i:Xt,r=(_=s==null?void 0:s.minr)!=null?_:Jt,a=r+n*t+Qt,l=a,c=2*Math.PI/o.length,u=(Math.PI+c)/2;e.lineWidth=n;const d=p=>{o.forEach((M,q)=>{const C=q*c-u,P=C+c,H=1-.1*(p-1),at=r+n*(t-p),lt=new b(M.rgb(),H);e.beginPath(),e.strokeStyle=lt.toRGBA(),e.arc(a,l,at,C,P),e.stroke(),e.closePath()})};for(let p=1;p<=t;p++)d(p)},Zt=["#FF0000","#FF8000","#FFFF00","#80FF00","#00FF00","#00FF80","#00FFFF","#0080FF","#0000FF","#8000FF","#FF00FF","#FF0080"],tt=Zt.map(o=>new b(o)),xt=o=>{x(tt,1,o,{minr:200,width:40})};const te=g({setup(o){return(t,e)=>(v(),$(k,{class:"twelve",convert:m(xt),colors:m(tt)},null,8,["convert","colors"]))}}),et=(o,t,e=.5)=>{const{r:s,g:n,b:r,a}=o.rgba(),{r:l,g:c,b:u,a:d}=t.rgba(),i=e*2-1,_=a-d,p=((i*_==-1?i:(i+_)/(1+i*_))+1)/2,M=1-p,q=[Math.round(s*p+l*M),Math.round(n*p+c*M),Math.round(r*p+u*M)],C=a*e+d*(1-e);return new b(q,C)},ot=(o,t=1,e=et)=>{const s=o.length;if(t<1||s<2)return o;const n=.5,r=[];return o.forEach((a,l)=>{r.push(a);const c=l+1<s?l+1:0;if(c!==l-1){const u=e(a,o[c],n);r.push(u)}}),t--,t?ot(r,t,e):r},ee=(o,t,e)=>oe(o,t,e,1),oe=(o,t,e,s)=>{let n=0,r=0,a=0;if(t===0)n=e,r=e,a=e;else{const l=e<.5?e*(1+t):e+t-e*t,c=2*e-l,u=o/360,d=i=>{i<0?i=i+1:i>1&&(i=i-1);let _=0;return i<1/6?_=c+(l-c)*6*i:i<1/2?_=l:i<2/3?_=c+(l-c)*6*(2/3-i):_=c,_};n=d(u+1/3),r=d(u),a=d(u-1/3)}return new b([n*255,r*255,a*255],s)},ne="#FF0000",se="#00FF00",re="#0000FF",ae="#ffff00",le="#00ffff",ce="#ff00ff",ie=[ne,ae,se,le,re,ce],ue=ie.map(o=>new b(o)),nt=ot(ue,3,et),he=o=>{x(nt,1,o,{minr:200,width:40})};const _e=g({setup(o){return(t,e)=>(v(),$(k,{class:"forty-eight",convert:m(he),colors:m(nt)},null,8,["convert","colors"]))}}),pe=["#FFFF00","#FFAA00","#FF8000","#FF5500","#FF0000","#FF0080","#FF00FF","#8080FF","#0080FF","#00FFFF","#00FF00","#80FF00"],R=pe.map(o=>new b(o)),O=40,N=200,fe=10,f=N+O+fe,F=f,V=2*Math.PI/R.length,h=N-O/2,Fe=(o,t)=>{const e=(Math.PI+V)/2;t.lineWidth=O,o.forEach((s,n)=>{const r=n*V-e,a=r+V;t.beginPath(),t.strokeStyle=s.toRGBA(),t.arc(f,F,N,r,a),t.stroke(),t.closePath()})},ve=(o,t)=>{const[e,s,n]=o;t.lineWidth=1,t.beginPath(),t.fillStyle=e.toRGBA(),t.moveTo(f,F),t.lineTo(f-h*Math.sqrt(3)/4,F-h/4),t.lineTo(f,F-h),t.lineTo(f+h*Math.sqrt(3)/4,F-h/4),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.moveTo(f,F),t.lineTo(f+h*Math.sqrt(3)/4,F-h/4),t.lineTo(f+h*Math.sqrt(3)/2,F+h/2),t.lineTo(f,F+h/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=n.toRGBA(),t.moveTo(f,F),t.lineTo(f-h*Math.sqrt(3)/4,F-h/4),t.lineTo(f-h*Math.sqrt(3)/2,F+h/2),t.lineTo(f,F+h/2),t.fill(),t.closePath()},de=(o,t)=>{const[e,s,n]=o;t.lineWidth=1,t.beginPath(),t.fillStyle=e.toRGBA(),t.lineTo(f,F-h),t.lineTo(f+h*Math.sqrt(3)/2,F+h/2),t.lineTo(f+h*Math.sqrt(3)/2,F-h/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.lineTo(f+h*Math.sqrt(3)/2,F+h/2),t.lineTo(f-h*Math.sqrt(3)/2,F+h/2),t.lineTo(f,F+h),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=n.toRGBA(),t.lineTo(f-h*Math.sqrt(3)/2,F+h/2),t.lineTo(f,F-h),t.lineTo(f-h*Math.sqrt(3)/2,F-h/2),t.fill(),t.closePath()},me=o=>{Fe(R,o),ve(R.filter((t,e)=>[0,4,8].includes(e)),o),de(R.filter((t,e)=>[2,6,10].includes(e)),o)};const ge=g({setup(o){return(t,e)=>(v(),$(k,{class:"itten",convert:m(me),colors:m(R)},null,8,["convert","colors"]))}}),ye=(o,t,e)=>[{x:o+e/2,y:t-e*Math.sqrt(3)/2},{x:o+e,y:t},{x:o+e/2,y:t+e*Math.sqrt(3)/2},{x:o-e/2,y:t+e*Math.sqrt(3)/2},{x:o-e,y:t},{x:o-e/2,y:t-e*Math.sqrt(3)/2}],be=(o,t,e,s=1)=>{if(s===0)return[{x:o,y:t}];const n=[],r=[],a=[],l=[],c=[],u=[];for(let i=1;i<=s;i++)n.push({x:o+i*e*3/2,y:t-s*e*Math.sqrt(3)+i*e*Math.sqrt(3)/2}),r.push({x:o+s*e*3/2,y:t+s*e*Math.sqrt(3)/2-(s-i)*e*Math.sqrt(3)}),a.push({x:o+(s-i)*e*3/2,y:t+s*e*Math.sqrt(3)-(s-i)*e*Math.sqrt(3)/2}),l.push({x:o-i*e*3/2,y:t+s*e*Math.sqrt(3)-i*e*Math.sqrt(3)/2}),c.push({x:o-s*e*3/2,y:t+s*e*Math.sqrt(3)/2-i*e*Math.sqrt(3)}),u.push({x:o-(s-i)*e*3/2,y:t-s*e*Math.sqrt(3)+(s-i)*e*Math.sqrt(3)/2});return n.concat(r,a,l,c,u)},Me=(o,t,e,s=1)=>{let n=[];for(let r=0;r<=s;r++){const a=be(o,t,e,r);n=n.concat(a)}return n},we=(o,t,e,s,n)=>{const r=ye(o,t,e);n.beginPath(),r.forEach(({x:a,y:l},c)=>{c===0?n.moveTo(a,l):n.lineTo(a,l)}),n.fillStyle=s.toRGBA(),n.fill(),n.closePath()},Ce=(o=1)=>new Array(o).fill("").map((s,n)=>(n+1)*6).reduce((s,n)=>s+n,1),$e=(o,t,e,s=1,n,r)=>{Me(o,t,e,s).forEach(({x:l,y:c},u)=>{const d="#"+Math.floor(Math.random()*16777215).toString(16),i=n[u]||new b(d);we(l,c,e,i,r)})},ke=(o,t,e,s=1,n)=>{const r=(s+1)*e*Math.sqrt(3);n.beginPath(),[{x:o+r*Math.sqrt(3)/2,y:t-r/2},{x:o+r*Math.sqrt(3)/2,y:t+r/2},{x:o,y:t+r},{x:o-r*Math.sqrt(3)/2,y:t+r/2},{x:o-r*Math.sqrt(3)/2,y:t-r/2},{x:o,y:t-r}].forEach(({x:l,y:c},u)=>{u===0?n.moveTo(l,c):n.lineTo(l,c)}),n.fillStyle="#000000",n.fill(),n.closePath()},Be=(o,t,e=1,s)=>{const n=(1+e*Math.sqrt(3))*t+t,r=n;ke(n,r,t,e,s),$e(n,r,t,e,o,s)},Y=[],st=8,qe=Ce(st);for(let o=0;o<qe;o++)Y.push(ee(o,1,.5));const Pe=o=>{Be(Y,10,st,o)};const Ae=g({setup(o){return(t,e)=>(v(),$(k,{class:"palette",convert:m(Pe),colors:m(Y)},null,8,["convert","colors"]))}}),rt=[{path:"/",name:"home",label:"\u8272\u5F69\u7684\u4E16\u754C",component:wt},{path:"/rgb",name:"rgb",label:"\u5149\u7684\u4E09\u539F\u8272\uFF08RGB\u6A21\u578B\uFF09",component:Dt},{path:"/cmyk",name:"cmyk",label:"\u5370\u5237\u56DB\u8272\uFF08CMYK\u6A21\u578B\uFF09",component:Vt},{path:"/twelve",name:"twelve",label:"\u5341\u4E8C\u8272\u73AF",component:te},{path:"/fortyeight",name:"fortyeight",label:"\u56DB\u5341\u516B\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:_e},{path:"/itten",name:"itten",label:"\u4F0A\u767B\u5341\u4E8C\u8272\u73AF\uFF08RYB\u6A21\u578B\uFF09",component:ge},{path:"/palette",name:"palette",label:"\u8C03\u8272\u677F",component:Ae},{path:"/art",name:"art",label:"\u7F8E\u672F\u4E09\u539F\u8272\uFF08RYB\u6A21\u578B\u6D4B\u8BD5\u4E2D\uFF09",component:zt}],Re=rt.map(({label:o,name:t})=>({label:o,value:t.toUpperCase()})),Se=it({history:ut(),routes:rt});const Te=g({setup(o){X(i=>({de4ac442:l,e3b8717e:u}));const t=ht(),e=_t(),s=E("HOME"),n=i=>{s.value=i,t.push({name:i.toLowerCase()})},r=j(()=>e.name||"home");z(r,i=>{s.value=i.toUpperCase()});const a=180,l=`${a}px`,c=10,u=`${c}px`,d=()=>{const i=document.getElementById("app"),{width:_,height:p}=i.getBoundingClientRect();ft("rank",{width:_-a-2*c,height:p-2*c})};return T(()=>{d()}),(i,_)=>{const p=pt("router-view");return v(),y(S,null,[L(gt,{current:s.value,"catalog-list":m(Re),onChange:n},null,8,["current","catalog-list"]),L(p,{class:"container"})],64)}}});Ft(Te).use(Se).mount("#app");
