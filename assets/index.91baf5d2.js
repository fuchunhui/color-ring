import{d as m,t as V,o as v,c as g,F as T,r as D,u as d,n as K,a as R,b as U,e as at,f as lt,g as S,h as j,w as z,i as E,j as ct,k as L,p as it,l as C,m as ut,q as I,s as $,v as ht,x as _t,y as Ft}from"./vendor.30883fb6.js";const pt=function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function e(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerpolicy&&(r.referrerPolicy=s.referrerpolicy),s.crossorigin==="use-credentials"?r.credentials="include":s.crossorigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=e(s);fetch(s.href,r)}};pt();const ft={class:"side"},vt=["onClick"],dt=m({props:{catalogList:null,current:null},emits:["change"],setup(o,{emit:t}){const n=V(o).catalogList,s=r=>{t("change",r)};return(r,a)=>(v(),g("div",ft,[(v(!0),g(T,null,D(d(n),({label:l,value:c})=>(v(),g("div",{key:c,class:K({"side-content":!0,"side-content-active":o.current===c}),onClick:i=>s(c)},R(l),11,vt))),128))]))}}),mt=[{label:"\u8272\u5F69\u4E16\u754C",value:"HOME"},{label:"\u5149\u7684\u4E09\u539F\u8272\uFF08RGB\u6A21\u578B\uFF09",value:"RGB"},{label:"\u5370\u5237\u56DB\u8272\uFF08CMYK\u6A21\u578B\uFF09",value:"CMYK"},{label:"\u5341\u4E8C\u8272\u73AF",value:"TWELVE"},{label:"\u56DB\u5341\u516B\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",value:"FORTYEIGHT"},{label:"\u4F0A\u767B\u5341\u4E8C\u8272\u73AF\uFF08RYB\u6A21\u578B\uFF09",value:"ITTEN"},{label:"\u8C03\u8272\u677F",value:"Palette"},{label:"\u7F8E\u672F\u4E09\u539F\u8272\uFF08RYB\u6A21\u578B\u6D4B\u8BD5\u4E2D\uFF09",value:"ART"}];const gt=m({setup(o){U(u=>({"3526017f":l,"373392e1":i}));const t=at(),e=lt(),n=S("HOME"),s=u=>{n.value=u,t.push({name:u.toLowerCase()})},r=j(()=>e.name||"home");z(r,u=>{n.value=u.toUpperCase()});const a=180,l=`${a}px`,c=10,i=`${c}px`,b=()=>{const u=document.getElementById("app"),{width:f,height:_}=u.getBoundingClientRect();it("rank",{width:f-a-2*c,height:_-2*c})};return E(()=>{b()}),(u,f)=>{const _=ct("router-view");return v(),g(T,null,[L(dt,{current:n.value,"catalog-list":d(mt),onChange:s},null,8,["current","catalog-list"]),L(_,{class:"container"})],64)}}});const yt={class:"color-wrap"},bt=C("p",null,"\u8FD9\u4E2A\u662F\u4EC0\u4E48\u5462",-1),Mt=[bt],Ct=m({setup(o){return E(()=>{}),(t,e)=>(v(),g("div",yt,Mt))}});class y{constructor(t=[0,0,0],e=1){if(this._rgb=[0,0,0],this._alpha=0,Array.isArray(t))this._rgb=t;else{const n=t.match(/^#/g)?t.slice(1):t,s=[],r=n.length>=6?n.match(/.{2}/g):n.split("");r==null||r.forEach((a,l)=>{const c=parseInt(n.length>=6?a:a+a,16);l<3?s.push(c):this._alpha=c/255}),this._rgb=s}this._alpha=this._alpha||(typeof e=="number"?e:1)}rgb(){return this._rgb}rgba(){const{0:t,1:e,2:n}=this.rgb();return{r:t,g:e,b:n,a:this.alpha()}}alpha(){return this._alpha}toRGB(){return this.toHex(this._rgb)}toRGBA(){return this.toHex(this._rgb.concat([this._alpha*255]))}toHex(t=this._rgb){const e=[];return t.forEach(n=>{const s=Math.min(Math.max(Math.round(n),0),255);e.push(s.toString(16).padStart(2,"0"))}),`#${e.join("").toLowerCase()}`}toHSL(){const{0:t,1:e,2:n}=this._rgb,s=Math.max(t,e,n),r=Math.min(t,e,n),a=(s+r)/2/255,l=s-r;let c=0,i=0;if(s===r)i=0,c=0;else switch(c=a>.5?l/(2*255-s-r):l/(s+r),s){case t:i=(e-n)/l*60;break;case e:i=(n-t)/l*60+120;break;case n:i=(t-e)/l*60+240;break}return i<0&&(i+=360),{h:i,s:c,l:Math.ceil(a*1e3)/1e3,a:this._alpha}}toHSV(){const{0:t,1:e,2:n}=this._rgb,s=Math.max(t,e,n),r=Math.min(t,e,n),a=Math.ceil(s/255*1e3)/1e3,l=s-r,c=s===0?0:l/s;let i=0;if(s===r)i=0;else switch(s){case t:i=(e-n)/l*60;break;case e:i=(n-t)/l*60+120;break;case n:i=(t-e)/l*60+240;break}return i<0&&(i+=360),{h:i,s:c,v:a,a:this._alpha}}toHSVReal(){}}const wt={class:"color-detail"},$t={class:"color-detail-table"},Bt={class:"color-detail-title"},kt={class:"color-detail-value"},At={class:"color-detail-code"},Pt=m({props:{color:null},setup(o){const e=V(o).color,n=j(()=>[{label:"Hex triplet",value:e.value.toHex(),code:"#FF00FF"},{label:"RGB Decimal",value:e.value.rgb(),code:"123"},{label:"RGB Percent",value:"RGB Percent",code:"123"},{label:"CMYK",value:"CMYK",code:"123"},{label:"HSL",value:"HSL",code:"123"},{label:"HSV(or HSB)",value:"HSV",code:"123"}]);return(s,r)=>(v(),g("div",wt,[C("table",$t,[C("tbody",null,[(v(!0),g(T,null,D(d(n),({label:a,value:l,code:c},i)=>(v(),g("tr",{key:i},[C("th",Bt,R(a),1),C("td",kt,R(l),1),C("td",At,[C("code",null,R(c),1)])]))),128))])])]))}});const Rt={class:"color-list"},qt={class:"color-list-wrap"},Tt=["onClick"],St=m({props:{colors:null,color:null},setup(o){const t=o,e=S(t.color),n=s=>{e.value=s};return z(()=>t.color,s=>{e.value=s},{deep:!0}),(s,r)=>(v(),g("div",Rt,[L(Pt,{color:e.value},null,8,["color"]),C("div",qt,[(v(!0),g(T,null,D(o.colors,(a,l)=>(v(),g("div",{key:l,class:K({"color-cell":!0,"color-cell-active":o.color.toHex()===a.toHex()}),style:ut({backgroundColor:a.toRGB()}),onClick:c=>n(a)},R(a.toRGB().toUpperCase()),15,Tt))),128))])]))}});const Et={class:"base-canvas"},B=m({props:{beforeConvert:{type:Function,default:()=>{}},convert:{type:Function,default:()=>{}},afterConvert:{type:Function,default:()=>{}},colors:{type:Array,default:()=>[]}},setup(o){const t=o;U(f=>({"1815c35a":l}));const e=S(null),{width:n,height:s}=I("rank");let r=document.createElement("canvas");const a=500,l=`${a}px`,c=S(new y),i=()=>{r=e.value,r.width=n-a,r.height=s;const f=r.getContext("2d");t.beforeConvert(f),t.convert(f),t.afterConvert(f)},b=f=>{const _=H=>H.toString(16).padStart(2,"0"),{0:M,1:A,2:w,3:P}=f.data;return`#${_(M)}${_(A)}${_(w)}${_(P)}`.toUpperCase()},u=f=>{const{offsetX:_,offsetY:M}=f;if(_<0||M<0)return;const w=r.getContext("2d").getImageData(_,M,1,1),P=b(w);console.log("click----> ",P),c.value=new y(P)};return E(()=>{i()}),(f,_)=>(v(),g("div",Et,[C("canvas",{class:"base-canvas-center",ref_key:"canvasRef",ref:e,onClick:u},null,512),L(St,{colors:o.colors,color:c.value},null,8,["colors","color"])]))}}),G=120,k=100,Lt=(o,t,e)=>[{x:k+G/2,y:k,color:o},{x:k,y:k+Math.sqrt(3)*G/2,color:t},{x:k+G,y:k+Math.sqrt(3)*G/2,color:e}],W=(o,t,e,n)=>{Lt(o,t,e).forEach(({x:r,y:a,color:l})=>{n.beginPath(),n.arc(r,a,k,0,2*Math.PI),n.fillStyle=l,n.fill()})},X="#FF0000",J="#00FF00",Q="#0000FF",Gt=[new y(X),new y(J),new y(Q)],Ht=o=>{o.globalCompositeOperation="screen",W(X,J,Q,o)};const Dt=m({setup(o){return(t,e)=>(v(),$(B,{class:"light",convert:d(Ht),colors:d(Gt)},null,8,["convert","colors"]))}}),It="#FF0000",Wt="#00FF00",Ot="#0000FF",Nt=o=>{const{width:t,height:e}=I("rank");o.globalCompositeOperation="difference",W(It,Wt,Ot,o),o.beginPath(),o.fillStyle="white",o.fillRect(0,0,t,e)};const Yt=m({setup(o){return(t,e)=>(v(),$(B,{class:"cmyk",convert:d(Nt)},null,8,["convert"]))}}),Vt="#FF0000",Kt="#00FF00",Ut="#0000FF",jt=o=>{const{width:t,height:e}=I("rank");o.globalCompositeOperation="difference",W(Vt,Kt,Ut,o),o.beginPath(),o.fillStyle="white",o.fillRect(0,0,t,e)};const zt=m({setup(o){return E(()=>{}),(t,e)=>(v(),$(B,{class:"art",convert:d(jt)},null,8,["convert"]))}}),Xt=20,Jt=200,Qt=10,Z=(o,t=1,e,n)=>{var u,f;if(!o.length||t<1)return;const s=(u=n==null?void 0:n.width)!=null?u:Xt,r=(f=n==null?void 0:n.minr)!=null?f:Jt,a=r+s*t+Qt,l=a,c=2*Math.PI/o.length,i=(Math.PI+c)/2;e.lineWidth=s;const b=_=>{o.forEach((M,A)=>{const w=A*c-i,P=w+c,H=1-.1*(_-1),st=r+s*(t-_),rt=new y(M.rgb(),H);e.beginPath(),e.strokeStyle=rt.toRGBA(),e.arc(a,l,st,w,P),e.stroke(),e.closePath()})};for(let _=1;_<=t;_++)b(_)},Zt=["#FF0000","#FF8000","#FFFF00","#80FF00","#00FF00","#00FF80","#00FFFF","#0080FF","#0000FF","#8000FF","#FF00FF","#FF0080"],x=Zt.map(o=>new y(o)),xt=o=>{Z(x,1,o,{minr:200,width:40})};const te=m({setup(o){return(t,e)=>(v(),$(B,{class:"twelve",convert:d(xt),colors:d(x)},null,8,["convert","colors"]))}}),tt=(o,t,e=.5)=>{const{r:n,g:s,b:r,a}=o.rgba(),{r:l,g:c,b:i,a:b}=t.rgba(),u=e*2-1,f=a-b,_=((u*f==-1?u:(u+f)/(1+u*f))+1)/2,M=1-_,A=[Math.round(n*_+l*M),Math.round(s*_+c*M),Math.round(r*_+i*M)],w=a*e+b*(1-e);return new y(A,w)},et=(o,t=1,e=tt)=>{const n=o.length;if(t<1||n<2)return o;const s=.5,r=[];return o.forEach((a,l)=>{r.push(a);const c=l+1<n?l+1:0;if(c!==l-1){const i=e(a,o[c],s);r.push(i)}}),t--,t?et(r,t,e):r},ee="#FF0000",oe="#00FF00",ne="#0000FF",se="#ffff00",re="#00ffff",ae="#ff00ff",le=[ee,se,oe,re,ne,ae],ce=le.map(o=>new y(o)),ot=et(ce,3,tt),ie=o=>{Z(ot,1,o,{minr:200,width:40})};const ue=m({setup(o){return(t,e)=>(v(),$(B,{class:"forty-eight",convert:d(ie),colors:d(ot)},null,8,["convert","colors"]))}}),he=["#FFFF00","#FFAA00","#FF8000","#FF5500","#FF0000","#FF0080","#FF00FF","#8080FF","#0080FF","#00FFFF","#00FF00","#80FF00"],q=he.map(o=>new y(o)),O=40,N=200,_e=10,F=N+O+_e,p=F,Y=2*Math.PI/q.length,h=N-O/2,Fe=(o,t)=>{const e=(Math.PI+Y)/2;t.lineWidth=O,o.forEach((n,s)=>{const r=s*Y-e,a=r+Y;t.beginPath(),t.strokeStyle=n.toRGBA(),t.arc(F,p,N,r,a),t.stroke(),t.closePath()})},pe=(o,t)=>{const[e,n,s]=o;t.lineWidth=1,t.beginPath(),t.fillStyle=e.toRGBA(),t.moveTo(F,p),t.lineTo(F-h*Math.sqrt(3)/4,p-h/4),t.lineTo(F,p-h),t.lineTo(F+h*Math.sqrt(3)/4,p-h/4),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=n.toRGBA(),t.moveTo(F,p),t.lineTo(F+h*Math.sqrt(3)/4,p-h/4),t.lineTo(F+h*Math.sqrt(3)/2,p+h/2),t.lineTo(F,p+h/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.moveTo(F,p),t.lineTo(F-h*Math.sqrt(3)/4,p-h/4),t.lineTo(F-h*Math.sqrt(3)/2,p+h/2),t.lineTo(F,p+h/2),t.fill(),t.closePath()},fe=(o,t)=>{const[e,n,s]=o;t.lineWidth=1,t.beginPath(),t.fillStyle=e.toRGBA(),t.lineTo(F,p-h),t.lineTo(F+h*Math.sqrt(3)/2,p+h/2),t.lineTo(F+h*Math.sqrt(3)/2,p-h/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=n.toRGBA(),t.lineTo(F+h*Math.sqrt(3)/2,p+h/2),t.lineTo(F-h*Math.sqrt(3)/2,p+h/2),t.lineTo(F,p+h),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.lineTo(F-h*Math.sqrt(3)/2,p+h/2),t.lineTo(F,p-h),t.lineTo(F-h*Math.sqrt(3)/2,p-h/2),t.fill(),t.closePath()},ve=o=>{Fe(q,o),pe(q.filter((t,e)=>[0,4,8].includes(e)),o),fe(q.filter((t,e)=>[2,6,10].includes(e)),o)};const de=m({setup(o){return(t,e)=>(v(),$(B,{class:"itten",convert:d(ve),colors:d(q)},null,8,["convert","colors"]))}}),me=(o,t,e)=>[{x:o+e/2,y:t-e*Math.sqrt(3)/2},{x:o+e,y:t},{x:o+e/2,y:t+e*Math.sqrt(3)/2},{x:o-e/2,y:t+e*Math.sqrt(3)/2},{x:o-e,y:t},{x:o-e/2,y:t-e*Math.sqrt(3)/2}],ge=(o,t,e,n,s)=>{const r=me(o,t,e);s.beginPath(),r.forEach(({x:a,y:l},c)=>{c===0?s.moveTo(a,l):s.lineTo(a,l)}),s.fillStyle=n.toRGBA(),s.fill(),s.closePath()},ye=(o,t,e,n=1)=>{if(n===0)return[{x:o,y:t}];const s=[],r=[],a=[],l=[],c=[],i=[];for(let u=1;u<=n;u++)s.push({x:o+u*e*3/2,y:t-n*e*Math.sqrt(3)+u*e*Math.sqrt(3)/2}),r.push({x:o+n*e*3/2,y:t+n*e*Math.sqrt(3)/2-(n-u)*e*Math.sqrt(3)}),a.push({x:o+(n-u)*e*3/2,y:t+n*e*Math.sqrt(3)-(n-u)*e*Math.sqrt(3)/2}),l.push({x:o-u*e*3/2,y:t+n*e*Math.sqrt(3)-u*e*Math.sqrt(3)/2}),c.push({x:o-n*e*3/2,y:t+n*e*Math.sqrt(3)/2-u*e*Math.sqrt(3)}),i.push({x:o-(n-u)*e*3/2,y:t-n*e*Math.sqrt(3)+(n-u)*e*Math.sqrt(3)/2});return s.concat(r,a,l,c,i)},be=(o,t,e,n=1)=>{let s=[];for(let r=0;r<=n;r++){const a=ye(o,t,e,r);s=s.concat(a)}return s},Me=(o,t,e=1,n)=>{const s=(1+e*Math.sqrt(3))*t;be(s,s,t,e).forEach(({x:l,y:c},i)=>{const b="#"+Math.floor(Math.random()*16777215).toString(16),u=o[i]||new y(b);ge(l,c,t,u,n)})},Ce=["#FFFF00","#FFAA00","#FF8000","#FF5500","#FF0000","#FF0080","#FF00FF","#8080FF","#0080FF","#00FFFF","#00FF00","#80FF00"];Ce.map(o=>new y(o));const nt=[],we=o=>{Me(nt,20,6,o)};const $e=m({setup(o){return(t,e)=>(v(),$(B,{class:"palette",convert:d(we),colors:d(nt)},null,8,["convert","colors"]))}}),Be=[{path:"/",name:"home",component:Ct},{path:"/rgb",name:"rgb",component:Dt},{path:"/cmyk",name:"cmyk",component:Yt},{path:"/art",name:"art",component:zt},{path:"/twelve",name:"twelve",component:te},{path:"/itten",name:"itten",component:de},{path:"/fortyeight",name:"fortyeight",component:ue},{path:"/palette",name:"palette",component:$e}],ke=ht({history:_t(),routes:Be});Ft(gt).use(ke).mount("#app");
