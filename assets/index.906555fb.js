import{d as v,t as U,o as p,c as m,F as S,r as I,u as g,n as j,a as R,b as z,e as re,f as le,g as E,h as X,w as J,i as T,j as ae,k as L,p as ce,l as $,m as ie,q as W,s as A,v as ue,x as he,y as _e}from"./vendor.30883fb6.js";const de=function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const l of r.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&s(l)}).observe(document,{childList:!0,subtree:!0});function o(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerpolicy&&(r.referrerPolicy=n.referrerpolicy),n.crossorigin==="use-credentials"?r.credentials="include":n.crossorigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(n){if(n.ep)return;n.ep=!0;const r=o(n);fetch(n.href,r)}};de();const pe={class:"side"},fe=["onClick"],Fe=v({props:{catalogList:null,current:null},emits:["change"],setup(t,{emit:e}){const s=U(t).catalogList,n=r=>{e("change",r)};return(r,l)=>(p(),m("div",pe,[(p(!0),m(S,null,I(g(s),({label:c,value:a})=>(p(),m("div",{key:a,class:j({"side-content":!0,"side-content-active":t.current===a}),onClick:u=>n(a)},R(c),11,fe))),128))]))}}),ge=[{label:"\u8272\u5F69\u4E16\u754C",value:"HOME"},{label:"\u5149\u7684\u4E09\u539F\u8272\uFF08RGB\u6A21\u578B\uFF09",value:"RGB"},{label:"\u5370\u5237\u56DB\u8272\uFF08CMYK\u6A21\u578B\uFF09",value:"CMYK"},{label:"\u5341\u4E8C\u8272\u73AF",value:"TWELVE"},{label:"\u56DB\u5341\u516B\u8272\u73AF",value:"FortyEight"},{label:"\u4F0A\u767B\u5341\u4E8C\u8272\u73AF\uFF08RYB\u6A21\u578B\uFF09",value:"ITTEN"},{label:"\u7F8E\u672F\u4E09\u539F\u8272\uFF08RYB\u6A21\u578B\u6D4B\u8BD5\u4E2D\uFF09",value:"ART"}];const ve=v({setup(t){z(f=>({"3526017f":c,"373392e1":u}));const e=re(),o=le(),s=E("HOME"),n=f=>{s.value=f,e.push({name:f.toLowerCase()})},r=X(()=>o.name||"home");J(r,f=>{s.value=f.toUpperCase()});const l=180,c=`${l}px`,a=10,u=`${a}px`,b=()=>{const f=document.getElementById("app"),{width:F,height:d}=f.getBoundingClientRect();ce("rank",{width:F-l-2*a,height:d-2*a})};return T(()=>{b()}),(f,F)=>{const d=ae("router-view");return p(),m(S,null,[L(Fe,{current:s.value,"catalog-list":g(ge),onChange:n},null,8,["current","catalog-list"]),L(d,{class:"container"})],64)}}});const me={class:"color-wrap"},ye=$("p",null,"\u8FD9\u4E2A\u662F\u4EC0\u4E48\u5462",-1),be=[ye],$e=v({setup(t){return T(()=>{}),(e,o)=>(p(),m("div",me,be))}});class y{constructor(e=[0,0,0],o=1){if(this._rgb=[0,0,0],this._alpha=0,Array.isArray(e))this._rgb=e;else{const s=e.match(/^#/g)?e.slice(1):e,n=[],r=s.length>=6?s.match(/.{2}/g):s.split("");r==null||r.forEach((l,c)=>{const a=parseInt(s.length>=6?l:l+l,16);c<3?n.push(a):this._alpha=a/255}),this._rgb=n}this._alpha=this._alpha||(typeof o=="number"?o:1)}rgb(){return this._rgb}rgba(){const{0:e,1:o,2:s}=this.rgb();return{r:e,g:o,b:s,a:this.alpha()}}alpha(){return this._alpha}toRGB(){return this.toHex(this._rgb)}toRGBA(){return this.toHex(this._rgb.concat([this._alpha*255]))}toHex(e=this._rgb){const o=[];return e.forEach(s=>{const n=Math.min(Math.max(Math.round(s),0),255);o.push(n.toString(16).padStart(2,"0"))}),`#${o.join("").toLowerCase()}`}toHSL(){const{0:e,1:o,2:s}=this._rgb,n=Math.max(e,o,s),r=Math.min(e,o,s),l=(n+r)/2/255,c=n-r;let a=0,u=0;if(n===r)u=0,a=0;else switch(a=l>.5?c/(2*255-n-r):c/(n+r),n){case e:u=(o-s)/c*60;break;case o:u=(s-e)/c*60+120;break;case s:u=(e-o)/c*60+240;break}return u<0&&(u+=360),{h:u,s:a,l:Math.ceil(l*1e3)/1e3,a:this._alpha}}toHSV(){const{0:e,1:o,2:s}=this._rgb,n=Math.max(e,o,s),r=Math.min(e,o,s),l=Math.ceil(n/255*1e3)/1e3,c=n-r,a=n===0?0:c/n;let u=0;if(n===r)u=0;else switch(n){case e:u=(o-s)/c*60;break;case o:u=(s-e)/c*60+120;break;case s:u=(e-o)/c*60+240;break}return u<0&&(u+=360),{h:u,s:a,v:l,a:this._alpha}}toHSVReal(){}}const Me={class:"color-detail"},we={class:"color-detail-table"},ke={class:"color-detail-title"},Be={class:"color-detail-value"},Ae={class:"color-detail-code"},Ce=v({props:{color:null},setup(t){const o=U(t).color,s=X(()=>[{label:"Hex triplet",value:o.value.toHex(),code:"#FF00FF"},{label:"RGB Decimal",value:o.value.rgb(),code:"123"},{label:"RGB Percent",value:"RGB Percent",code:"123"},{label:"CMYK",value:"CMYK",code:"123"},{label:"HSL",value:"HSL",code:"123"},{label:"HSV(or HSB)",value:"HSV",code:"123"}]);return(n,r)=>(p(),m("div",Me,[$("table",we,[$("tbody",null,[(p(!0),m(S,null,I(g(s),({label:l,value:c,code:a},u)=>(p(),m("tr",{key:u},[$("th",ke,R(l),1),$("td",Be,R(c),1),$("td",Ae,[$("code",null,R(a),1)])]))),128))])])]))}});const Re={class:"color-list"},Pe={class:"color-list-wrap"},Se=["onClick"],Ee=v({props:{colors:null,color:null},setup(t){const e=t,o=E(e.color),s=n=>{o.value=n};return J(()=>e.color,n=>{o.value=n},{deep:!0}),(n,r)=>(p(),m("div",Re,[L(Ce,{color:o.value},null,8,["color"]),$("div",Pe,[(p(!0),m(S,null,I(t.colors,(l,c)=>(p(),m("div",{key:c,class:j({"color-cell":!0,"color-cell-active":t.color.toHex()===l.toHex()}),style:ie({backgroundColor:l.toRGB()}),onClick:a=>s(l)},R(l.toRGB().toUpperCase()),15,Se))),128))])]))}});const Te={class:"base-canvas"},C=v({props:{beforeConvert:{type:Function,default:()=>{}},convert:{type:Function,default:()=>{}},afterConvert:{type:Function,default:()=>{}},colors:{type:Array,default:()=>[]}},setup(t){const e=t;z(F=>({"1815c35a":c}));const o=E(null),{width:s,height:n}=W("rank");let r=document.createElement("canvas");const l=500,c=`${l}px`,a=E(new y),u=()=>{r=o.value,r.width=s-l,r.height=n;const F=r.getContext("2d");e.beforeConvert(F),e.convert(F),e.afterConvert(F)},b=F=>{const d=D=>D.toString(16).padStart(2,"0"),{0:w,1:P,2:k,3:B}=F.data;return`#${d(w)}${d(P)}${d(k)}${d(B)}`.toUpperCase()},f=F=>{const{offsetX:d,offsetY:w}=F;if(d<0||w<0)return;const k=r.getContext("2d").getImageData(d,w,1,1),B=b(k);console.log("click----> ",B),a.value=new y(B)};return T(()=>{u()}),(F,d)=>(p(),m("div",Te,[$("canvas",{class:"base-canvas-center",ref_key:"canvasRef",ref:o,onClick:f},null,512),L(Ee,{colors:t.colors,color:a.value},null,8,["colors","color"])]))}}),H=120,M=100,Le=(t,e,o)=>[{x:M+H/2,y:M,color:t},{x:M,y:M+Math.sqrt(3)*H/2,color:e},{x:M+H,y:M+Math.sqrt(3)*H/2,color:o}],O=(t,e,o,s)=>{Le(t,e,o).forEach(({x:r,y:l,color:c})=>{s.beginPath(),s.arc(r,l,M,0,2*Math.PI),s.fillStyle=c,s.fill()})},Q="#FF0000",Z="#00FF00",x="#0000FF",He=[new y(Q),new y(Z),new y(x)],qe=t=>{t.globalCompositeOperation="screen",O(Q,Z,x,t)};const Ge=v({setup(t){return(e,o)=>(p(),A(C,{class:"light",convert:g(qe),colors:g(He)},null,8,["convert","colors"]))}}),De="#FF0000",Ie="#00FF00",We="#0000FF",Oe=t=>{const{width:e,height:o}=W("rank");t.globalCompositeOperation="difference",O(De,Ie,We,t),t.beginPath(),t.fillStyle="white",t.fillRect(0,0,e,o)};const Ne=v({setup(t){return(e,o)=>(p(),A(C,{class:"cmyk",convert:g(Oe)},null,8,["convert"]))}}),Ve="#FF0000",Ye="#00FF00",Ke="#0000FF",Ue=t=>{const{width:e,height:o}=W("rank");t.globalCompositeOperation="difference",O(Ve,Ye,Ke,t),t.beginPath(),t.fillStyle="white",t.fillRect(0,0,e,o)};const je=v({setup(t){return T(()=>{}),(e,o)=>(p(),A(C,{class:"art",convert:g(Ue)},null,8,["convert"]))}}),ze=20,Xe=200,Je=10,ee=(t,e=1,o,s)=>{var f,F;if(!t.length||e<1)return;const n=(f=s==null?void 0:s.width)!=null?f:ze,r=(F=s==null?void 0:s.minr)!=null?F:Xe,l=r+n*e+Je,c=l,a=2*Math.PI/t.length,u=(Math.PI+a)/2;o.lineWidth=n;const b=d=>{t.forEach((w,P)=>{const k=P*a-u,B=k+a,D=1-.1*(d-1),ne=r+n*(e-d),se=new y(w.rgb(),D);o.beginPath(),o.strokeStyle=se.toRGBA(),o.arc(l,c,ne,k,B),o.stroke(),o.closePath()})};for(let d=1;d<=e;d++)b(d)},Qe=["#FF0000","#FF8000","#FFFF00","#80FF00","#00FF00","#00FF80","#00FFFF","#0080FF","#0000FF","#8000FF","#FF00FF","#FF0080"],te=Qe.map(t=>new y(t)),Ze=t=>{ee(te,1,t,{minr:200,width:40})};const xe=v({setup(t){return(e,o)=>(p(),A(C,{class:"twelve",convert:g(Ze),colors:g(te)},null,8,["convert","colors"]))}}),et=(t,e,o)=>{const s=[],n=e.alpha(),r=o.alpha(),l=n+r*(1-n);let c=0;for(let a=0;a<3;a++){const u=e.rgb()[a]/255,b=o.rgb()[a]/255,f=q[t](b,u);l&&(c=(n*u+r*(b-n*(b+u-f)))/l),s[a]=parseInt(`${c*255}`,10)}return new y(s,l)},q={normal:(t,e)=>e,multiply:(t,e)=>t*e,screen:(t,e)=>t+e-t*e,overlay:(t,e)=>q.hardlight(e,t),darken:(t,e)=>Math.min(t,e),lighten:(t,e)=>Math.max(t,e),colordodge:(t,e)=>t===0?0:e===1?1:Math.min(1,t/(1-e)),colorburn:(t,e)=>t===1?1:e===0?0:1-Math.min(1,(1-t)/e),hardlight:(t,e)=>e<=.5?q.multiply(t,2*e):q.screen(t,2*e-1),softlight:(t,e)=>{if(e<=.5)return t-(1-2*e)*t*(1-t);{const o=s=>s<=.25?((16*s-12)*s+4)*s:Math.sqrt(s);return t+(2*e-1)*(o(t)-t)}},difference:(t,e)=>Math.abs(t-e),exclusion:(t,e)=>t+e-2*t*e},oe=(t,e=1,o="screen")=>{const s=t.length;if(e<1||s<2)return t;const n=[];return t.forEach((r,l)=>{n.push(r);const c=l+1<s?l+1:0;if(c!==l-1){const a=et(o,r,t[c]);n.push(a)}}),e--,e?oe(n,e,o):n},tt="#FF0000",ot="#00FF00",nt="#0000FF",st=[tt,ot,nt],rt=st.map(t=>new y(t)),N=oe(rt,1);console.log("48: ",N);const lt=t=>{ee(N,1,t,{minr:200,width:40})};const at=v({setup(t){return(e,o)=>(p(),A(C,{class:"forty-eight",convert:g(lt),colors:g(N)},null,8,["convert","colors"]))}}),ct=["#FFFF00","#FFAA00","#FF8000","#FF5500","#FF0000","#FF0080","#FF00FF","#8080FF","#0080FF","#00FFFF","#00FF00","#80FF00"],G=ct.map(t=>new y(t)),V=40,Y=200,it=10,h=Y+V+it,_=h,K=2*Math.PI/12,i=Y-V/2,ut=(t,e)=>{const o=(Math.PI+K)/2;e.lineWidth=V,t.forEach((s,n)=>{const r=n*K-o,l=r+K;e.beginPath(),e.strokeStyle=s.toRGBA(),e.arc(h,_,Y,r,l),e.stroke(),e.closePath()})},ht=(t,e)=>{const[o,s,n]=t;e.lineWidth=1,e.beginPath(),e.fillStyle=o.toRGBA(),e.moveTo(h,_),e.lineTo(h-i*Math.sqrt(3)/4,_-i/4),e.lineTo(h,_-i),e.lineTo(h+i*Math.sqrt(3)/4,_-i/4),e.fill(),e.closePath(),e.beginPath(),e.fillStyle=s.toRGBA(),e.moveTo(h,_),e.lineTo(h+i*Math.sqrt(3)/4,_-i/4),e.lineTo(h+i*Math.sqrt(3)/2,_+i/2),e.lineTo(h,_+i/2),e.fill(),e.closePath(),e.beginPath(),e.fillStyle=n.toRGBA(),e.moveTo(h,_),e.lineTo(h-i*Math.sqrt(3)/4,_-i/4),e.lineTo(h-i*Math.sqrt(3)/2,_+i/2),e.lineTo(h,_+i/2),e.fill(),e.closePath()},_t=(t,e)=>{const[o,s,n]=t;e.lineWidth=1,e.beginPath(),e.fillStyle=o.toRGBA(),e.lineTo(h,_-i),e.lineTo(h+i*Math.sqrt(3)/2,_+i/2),e.lineTo(h+i*Math.sqrt(3)/2,_-i/2),e.fill(),e.closePath(),e.beginPath(),e.fillStyle=s.toRGBA(),e.lineTo(h+i*Math.sqrt(3)/2,_+i/2),e.lineTo(h-i*Math.sqrt(3)/2,_+i/2),e.lineTo(h,_+i),e.fill(),e.closePath(),e.beginPath(),e.fillStyle=n.toRGBA(),e.lineTo(h-i*Math.sqrt(3)/2,_+i/2),e.lineTo(h,_-i),e.lineTo(h-i*Math.sqrt(3)/2,_-i/2),e.fill(),e.closePath()},dt=t=>{ut(G,t),ht(G.filter((e,o)=>[0,4,8].includes(o)),t),_t(G.filter((e,o)=>[2,6,10].includes(o)),t)};const pt=v({setup(t){return(e,o)=>(p(),A(C,{class:"itten",convert:g(dt),colors:g(G)},null,8,["convert","colors"]))}}),ft=[{path:"/",name:"home",component:$e},{path:"/rgb",name:"rgb",component:Ge},{path:"/cmyk",name:"cmyk",component:Ne},{path:"/art",name:"art",component:je},{path:"/twelve",name:"twelve",component:xe},{path:"/itten",name:"itten",component:pt},{path:"/fortyeight",name:"fortyeight",component:at}],Ft=ue({history:he(),routes:ft});_e(ve).use(Ft).mount("#app");
