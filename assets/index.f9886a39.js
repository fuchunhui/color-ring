import{d as v,t as tt,o as m,c as y,F as R,r as I,u as d,n as ot,a as E,b as T,e as B,f as C,g as L,w as nt,h as G,i as bt,j as et,k as O,l as M,m as $t,p as yt,q as Mt,s as wt,v as Ct,x as kt,y as Bt}from"./vendor.3aef3a48.js";const qt=function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const r of e)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&s(c)}).observe(document,{childList:!0,subtree:!0});function o(e){const r={};return e.integrity&&(r.integrity=e.integrity),e.referrerpolicy&&(r.referrerPolicy=e.referrerpolicy),e.crossorigin==="use-credentials"?r.credentials="include":e.crossorigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(e){if(e.ep)return;e.ep=!0;const r=o(e);fetch(e.href,r)}};qt();const At={class:"side"},Pt=["onClick"],St=v({props:{catalogList:null,current:null},emits:["change"],setup(n,{emit:t}){const s=tt(n).catalogList,e=r=>{t("change",r)};return(r,c)=>(m(),y("div",At,[(m(!0),y(R,null,I(d(s),({label:a,value:u})=>(m(),y("div",{key:u,class:ot({"side-content":!0,"side-content-active":n.current===u}),onClick:i=>e(u)},E(a),11,Pt))),128))]))}});const Rt={class:"color-wrap"},Et=B("p",null,"\u8FD9\u4E2A\u662F\u4EC0\u4E48\u5462",-1),Tt=[Et],Lt=v({setup(n){return T(()=>{}),(t,o)=>(m(),y("div",Rt,Tt))}});class b{constructor(t=[0,0,0],o=1){if(this._rgb=[0,0,0],this._alpha=0,Array.isArray(t))this._rgb=t;else{const s=t.match(/^#/g)?t.slice(1):t,e=[],r=s.length>=6?s.match(/.{2}/g):s.split("");r==null||r.forEach((c,a)=>{const u=parseInt(s.length>=6?c:c+c,16);a<3?e.push(u):this._alpha=u/255}),this._rgb=e}this._alpha=this._alpha||(typeof o=="number"?o:1)}rgb(){return this._rgb}rgba(){const{0:t,1:o,2:s}=this.rgb();return{r:t,g:o,b:s,a:this.alpha()}}alpha(){return this._alpha}toRGB(){return this.toHex(this._rgb)}toRGBA(){return this.toHex(this._rgb.concat([this._alpha*255]))}toHex(t=this._rgb){const o=[];return t.forEach(s=>{const e=Math.min(Math.max(Math.round(s),0),255);o.push(e.toString(16).padStart(2,"0"))}),`#${o.join("").toLowerCase()}`}toHSL(){const{0:t,1:o,2:s}=this._rgb,e=Math.max(t,o,s),r=Math.min(t,o,s),c=(e+r)/2/255,a=e-r;let u=0,i=0;if(e===r)i=0,u=0;else switch(u=c>.5?a/(2*255-e-r):a/(e+r),e){case t:i=(o-s)/a*60;break;case o:i=(s-t)/a*60+120;break;case s:i=(t-o)/a*60+240;break}return i<0&&(i+=360),{h:Math.round(i),s:u,l:Math.ceil(c*1e3)/1e3,a:this._alpha}}toHSV(){const{0:t,1:o,2:s}=this._rgb,e=Math.max(t,o,s),r=Math.min(t,o,s),c=Math.ceil(e/255*1e3)/1e3,a=e-r,u=e===0?0:a/e;let i=0;if(e===r)i=0;else switch(e){case t:i=(o-s)/a*60;break;case o:i=(s-t)/a*60+120;break;case s:i=(t-o)/a*60+240;break}return i<0&&(i+=360),{h:Math.round(i),s:u,v:c,a:this._alpha}}toCMYK(){const{0:t,1:o,2:s}=this._rgb,e=Math.max(t,o,s)/255;if(e===0)return{c:0,m:0,y:0,k:1};const r=1-e,c=(e-t/255)/e,a=(e-o/255)/e,u=(e-s/255)/e;return{c,m:a,y:u,k:r}}}const Gt={class:"color-detail"},Dt={class:"color-detail-table"},Ht={class:"color-detail-title"},Wt={class:"color-detail-code"},It=v({props:{color:null},setup(n){const o=tt(n).color,s=C(()=>o.value.toHex().toUpperCase()),e=C(()=>o.value.rgb().join(", ")),r=C(()=>{const _=[];return o.value.rgb().forEach(l=>{const h=Math.round(l*100/255);_.push(`${h}%`)}),_.join(", ")}),c=C(()=>{const{h:_,s:l,l:h}=o.value.toHSL();return[_,`${l*100}%`,`${h*100}`].join(", ")}),a=C(()=>{const{h:_,s:l,v:h}=o.value.toHSV();return[`${_}\xB0`,`${l*100}`,`${h*100}`].join(", ")}),u=C(()=>{const{c:_,m:l,y:h,k:p}=o.value.toCMYK();return`${_*100}, ${l*100}, ${h*100}, ${p}`}),i=C(()=>[{label:"Hex triplet",code:s.value},{label:"RGB Decimal",code:`rgb(${e.value})`},{label:"RGB Percent",code:`rgb(${r.value})`},{label:"CMYK",code:u.value},{label:"HSL",code:`hsl(${c.value})`},{label:"HSV(or HSB)",code:a.value}]);return(_,l)=>(m(),y("div",Gt,[B("table",Dt,[B("tbody",null,[(m(!0),y(R,null,I(d(i),({label:h,code:p},$)=>(m(),y("tr",{key:$},[B("th",Ht,E(h),1),B("td",Wt,[B("code",null,E(p),1)])]))),128))])])]))}});const Ot={class:"color-list"},jt={class:"color-list-wrap"},Nt=["onClick"],Ut=v({props:{colors:null,color:null},setup(n){const t=n,o=L(t.color),s=e=>{o.value=e};return nt(()=>t.color,e=>{o.value=e},{deep:!0}),(e,r)=>(m(),y("div",Ot,[G(It,{color:o.value},null,8,["color"]),B("div",jt,[(m(!0),y(R,null,I(n.colors,(c,a)=>(m(),y("div",{key:a,class:ot({"color-cell":!0,"color-cell-active":n.color.toHex()===c.toHex()}),style:bt({backgroundColor:c.toRGB()}),onClick:u=>s(c)},E(c.toRGB().toUpperCase()),15,Nt))),128))])]))}});const Yt={class:"base-canvas"},w=v({props:{beforeConvert:{type:Function,default:()=>{}},convert:{type:Function,default:()=>{}},afterConvert:{type:Function,default:()=>{}},colors:{type:Array,default:()=>[]}},setup(n){const t=n;et(h=>({"0a258e78":a}));const o=L(null),{width:s,height:e}=O("rank");let r=document.createElement("canvas");const c=390,a=`${c}px`,u=L(new b),i=()=>{r=o.value,r.width=s-c,r.height=e;const h=r.getContext("2d");t.beforeConvert(h),t.convert(h),t.afterConvert(h)},_=h=>{const p=W=>W.toString(16).padStart(2,"0"),{0:$,1:A,2:k,3:P}=h.data;return`#${p($)}${p(A)}${p(k)}${p(P)}`.toUpperCase()},l=h=>{const{offsetX:p,offsetY:$}=h;if(p<0||$<0)return;const k=r.getContext("2d").getImageData(p,$,1,1),P=_(k);console.log("click----> ",P),u.value=new b(P)};return T(()=>{i()}),(h,p)=>(m(),y("div",Yt,[B("canvas",{class:"base-canvas-center",ref_key:"canvasRef",ref:o,onClick:l},null,512),G(Ut,{colors:n.colors,color:u.value},null,8,["colors","color"])]))}}),D=120,q=100,Vt=(n,t,o)=>[{x:q+D/2,y:q,color:n},{x:q,y:q+Math.sqrt(3)*D/2,color:t},{x:q+D,y:q+Math.sqrt(3)*D/2,color:o}],j=(n,t,o,s)=>{Vt(n,t,o).forEach(({x:r,y:c,color:a})=>{s.beginPath(),s.arc(r,c,q,0,2*Math.PI),s.fillStyle=a,s.fill()})},st="#FF0000",rt="#00FF00",ct="#0000FF",Kt="#ffff00",zt="#00ffff",Xt="#ff00ff",Jt="#FFFFFF",Qt=[st,Kt,rt,zt,ct,Xt,Jt],Zt=Qt.map(n=>new b(n)),xt=n=>{n.globalCompositeOperation="screen",j(st,rt,ct,n)},to=v({setup(n){return(t,o)=>(m(),M(w,{convert:d(xt),colors:d(Zt)},null,8,["convert","colors"]))}}),at="#FF0000",lt="#00FF00",ut="#0000FF",oo="#ffff00",no="#00ffff",eo="#ff00ff",so="#FFFFFF",ro=[at,oo,lt,no,ut,eo,so],co=ro.map(n=>new b(n)),ao=n=>{const{width:t,height:o}=O("rank");n.globalCompositeOperation="difference",j(at,lt,ut,n),n.beginPath(),n.fillStyle="white",n.fillRect(0,0,t,o)},lo=v({setup(n){return(t,o)=>(m(),M(w,{convert:d(ao),colors:d(co)},null,8,["convert","colors"]))}}),uo="#FF0000",io="#00FF00",ho="#0000FF",fo=n=>{const{width:t,height:o}=O("rank");n.globalCompositeOperation="difference",j(uo,io,ho,n),n.beginPath(),n.fillStyle="white",n.fillRect(0,0,t,o)};const po=v({setup(n){return T(()=>{}),(t,o)=>(m(),M(w,{class:"art",convert:d(fo)},null,8,["convert"]))}}),_o=20,Fo=200,mo=10,N=(n,t=1,o,s)=>{var l,h;if(!n.length||t<1)return;const e=(l=s==null?void 0:s.width)!=null?l:_o,r=(h=s==null?void 0:s.minr)!=null?h:Fo,c=r+e*t+mo,a=c,u=2*Math.PI/n.length,i=(Math.PI+u)/2;o.lineWidth=e;const _=p=>{n.forEach(($,A)=>{const k=A*u-i,P=k+u,W=1-.1*(p-1),gt=r+e*(t-p),vt=new b($.rgb(),W);o.beginPath(),o.strokeStyle=vt.toRGBA(),o.arc(c,a,gt,k,P),o.stroke(),o.closePath()})};for(let p=1;p<=t;p++)_(p)},go=["#FF0000","#FF8000","#FFFF00","#80FF00","#00FF00","#00FF80","#00FFFF","#0080FF","#0000FF","#8000FF","#FF00FF","#FF0080"],it=go.map(n=>new b(n)),vo=n=>{N(it,1,n,{minr:200,width:40})},bo=v({setup(n){return(t,o)=>(m(),M(w,{convert:d(vo),colors:d(it)},null,8,["convert","colors"]))}}),U=(n,t,o=.5)=>{const{r:s,g:e,b:r,a:c}=n.rgba(),{r:a,g:u,b:i,a:_}=t.rgba(),l=o*2-1,h=c-_,p=((l*h==-1?l:(l+h)/(1+l*h))+1)/2,$=1-p,A=[Math.round(s*p+a*$),Math.round(e*p+u*$),Math.round(r*p+i*$)],k=c*o+_*(1-o);return new b(A,k)},Y=(n,t=1,o=U)=>{const s=n.length;if(t<1||s<2)return n;const e=.5,r=[];return n.forEach((c,a)=>{r.push(c);const u=a+1<s?a+1:0;if(u!==a-1){const i=o(c,n[u],e);r.push(i)}}),t--,t?Y(r,t,o):r},$o=(n,t,o)=>yo(n,t,o,1),yo=(n,t,o,s)=>{let e=0,r=0,c=0;if(t===0)e=o,r=o,c=o;else{const a=o<.5?o*(1+t):o+t-o*t,u=2*o-a,i=n/360,_=l=>{l<0?l=l+1:l>1&&(l=l-1);let h=0;return l<1/6?h=u+(a-u)*6*l:l<1/2?h=a:l<2/3?h=u+(a-u)*6*(2/3-l):h=u,h};e=_(i+1/3),r=_(i),c=_(i-1/3)}return new b([e*255,r*255,c*255],s)},Mo="#FF0000",wo="#00FF00",Co="#0000FF",ko="#ffff00",Bo="#00ffff",qo="#ff00ff",Ao=[Mo,ko,wo,Bo,Co,qo],Po=Ao.map(n=>new b(n)),ht=Y(Po,3,U),So=n=>{N(ht,1,n,{minr:200,width:40})},Ro=v({setup(n){return(t,o)=>(m(),M(w,{convert:d(So),colors:d(ht)},null,8,["convert","colors"]))}}),Eo="#FF0000",To="#00FF00",Lo="#0000FF",Go="#ffff00",Do="#00ffff",Ho="#ff00ff",Wo=[Eo,Go,To,Do,Lo,Ho],Io=Wo.map(n=>new b(n)),ft=Y(Io,4,U),Oo=n=>{N(ft,10,n,{minr:160,width:20})},jo=v({setup(n){return(t,o)=>(m(),M(w,{convert:d(Oo),colors:d(ft)},null,8,["convert","colors"]))}}),No=["#FFFF00","#FFAA00","#FF8000","#FF5500","#FF0000","#FF0080","#FF00FF","#8080FF","#0080FF","#00FFFF","#00FF00","#80FF00"],S=No.map(n=>new b(n)),V=40,K=200,Uo=10,F=K+V+Uo,g=F,z=2*Math.PI/S.length,f=K-V/2,Yo=(n,t)=>{const o=(Math.PI+z)/2;t.lineWidth=V,n.forEach((s,e)=>{const r=e*z-o,c=r+z;t.beginPath(),t.strokeStyle=s.toRGBA(),t.arc(F,g,K,r,c),t.stroke(),t.closePath()})},Vo=(n,t)=>{const[o,s,e]=n;t.lineWidth=1,t.beginPath(),t.fillStyle=o.toRGBA(),t.moveTo(F,g),t.lineTo(F-f*Math.sqrt(3)/4,g-f/4),t.lineTo(F,g-f),t.lineTo(F+f*Math.sqrt(3)/4,g-f/4),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.moveTo(F,g),t.lineTo(F+f*Math.sqrt(3)/4,g-f/4),t.lineTo(F+f*Math.sqrt(3)/2,g+f/2),t.lineTo(F,g+f/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=e.toRGBA(),t.moveTo(F,g),t.lineTo(F-f*Math.sqrt(3)/4,g-f/4),t.lineTo(F-f*Math.sqrt(3)/2,g+f/2),t.lineTo(F,g+f/2),t.fill(),t.closePath()},Ko=(n,t)=>{const[o,s,e]=n;t.lineWidth=1,t.beginPath(),t.fillStyle=o.toRGBA(),t.lineTo(F,g-f),t.lineTo(F+f*Math.sqrt(3)/2,g+f/2),t.lineTo(F+f*Math.sqrt(3)/2,g-f/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.lineTo(F+f*Math.sqrt(3)/2,g+f/2),t.lineTo(F-f*Math.sqrt(3)/2,g+f/2),t.lineTo(F,g+f),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=e.toRGBA(),t.lineTo(F-f*Math.sqrt(3)/2,g+f/2),t.lineTo(F,g-f),t.lineTo(F-f*Math.sqrt(3)/2,g-f/2),t.fill(),t.closePath()},zo=n=>{Yo(S,n),Vo(S.filter((t,o)=>[0,4,8].includes(o)),n),Ko(S.filter((t,o)=>[2,6,10].includes(o)),n)},Xo=v({setup(n){return(t,o)=>(m(),M(w,{class:"itten",convert:d(zo),colors:d(S)},null,8,["convert","colors"]))}}),Jo=(n,t,o)=>[{x:n+o/2,y:t-o*Math.sqrt(3)/2},{x:n+o,y:t},{x:n+o/2,y:t+o*Math.sqrt(3)/2},{x:n-o/2,y:t+o*Math.sqrt(3)/2},{x:n-o,y:t},{x:n-o/2,y:t-o*Math.sqrt(3)/2}],Qo=(n,t,o,s=1)=>{if(s===0)return[{x:n,y:t}];const e=[],r=[],c=[],a=[],u=[],i=[];for(let l=1;l<=s;l++)e.push({x:n+l*o*3/2,y:t-s*o*Math.sqrt(3)+l*o*Math.sqrt(3)/2}),r.push({x:n+s*o*3/2,y:t+s*o*Math.sqrt(3)/2-(s-l)*o*Math.sqrt(3)}),c.push({x:n+(s-l)*o*3/2,y:t+s*o*Math.sqrt(3)-(s-l)*o*Math.sqrt(3)/2}),a.push({x:n-l*o*3/2,y:t+s*o*Math.sqrt(3)-l*o*Math.sqrt(3)/2}),u.push({x:n-s*o*3/2,y:t+s*o*Math.sqrt(3)/2-l*o*Math.sqrt(3)}),i.push({x:n-(s-l)*o*3/2,y:t-s*o*Math.sqrt(3)+(s-l)*o*Math.sqrt(3)/2});return e.concat(r,c,a,u,i)},X=(n,t,o,s=1)=>{let e=[];for(let r=0;r<=s;r++){const c=Qo(n,t,o,r);e=e.concat(c)}return e},J=(n,t,o,s,e)=>{const r=Jo(n,t,o);e.beginPath(),r.forEach(({x:c,y:a},u)=>{u===0?e.moveTo(c,a):e.lineTo(c,a)}),e.fillStyle=s.toRGBA(),e.fill(),e.closePath()},Q=(n=1)=>new Array(n).fill("").map((s,e)=>(e+1)*6).reduce((s,e)=>s+e,1),Zo=(n,t,o,s=1,e,r)=>{X(n,t,o,s).forEach(({x:a,y:u},i)=>{const _="#"+Math.floor(Math.random()*16777215).toString(16),l=e[i]||new b(_);J(a,u,o,l,r)})},xo=(n,t,o,s=1,e)=>{const r=(s+1)*o*Math.sqrt(3);e.beginPath(),[{x:n+r*Math.sqrt(3)/2,y:t-r/2},{x:n+r*Math.sqrt(3)/2,y:t+r/2},{x:n,y:t+r},{x:n-r*Math.sqrt(3)/2,y:t+r/2},{x:n-r*Math.sqrt(3)/2,y:t-r/2},{x:n,y:t-r}].forEach(({x:a,y:u},i)=>{i===0?e.moveTo(a,u):e.lineTo(a,u)}),e.fillStyle="#000000",e.fill(),e.closePath()},tn=(n,t,o=1,s)=>{const e=(1+o*Math.sqrt(3))*t+t,r=e;xo(e,r,t,o,s),X(e,r,t,o).forEach(({x:a,y:u},i)=>{J(a,u,t,n[i],s)})},pt=8,on=Q(pt);let H=[];for(let n=0;n<on;n++){const t=Math.floor(Math.random()*4095);H.push(t)}H=H.sort((n,t)=>t-n);const _t=H.map(n=>new b(`#${n.toString(16).padStart(3,"0")}`)),nn=n=>{tn(_t,25,pt,n)},en=v({setup(n){return(t,o)=>(m(),M(w,{convert:d(nn),colors:d(_t)},null,8,["convert","colors"]))}}),sn=n=>{const t=[];for(let o=1;o<=n;o++)t.push(o);return t},rn=(n,t)=>{const o=sn(n),s=[];let e=1;for(;o.length>0;){const r=[];for(let c=0;c<Math.min(e,t)&&o.length!==0;c++){const a=Math.floor(Math.random()*o.length);r.push(o[a]-1),o.splice(a,1)}s.push(r),e++}return s},cn=(n,t,o,s,e)=>{s.forEach(({x:r,y:c})=>{const a="#"+Math.floor(Math.random()*16777215).toString(16);Ft.push(new b(a)),J(r,c,o,new b(a),e)})},Ft=[],Z=10,an=Q(Z),ln=rn(an,6),un=100,hn=n=>{const t=20,o=(1+Z*Math.sqrt(3))*t+t,s=o,e=X(o,s,t,Z);ln.forEach((r,c)=>{setTimeout(()=>{const a=r.map(u=>e[u]);cn(o,s,t,a,n)},c*un)})},fn=v({setup(n){const t=C(()=>Ft);return(o,s)=>(m(),M(w,{convert:d(hn),colors:d(t)},null,8,["convert","colors"]))}}),pn=(n,t,o=1,s)=>{const e=(1+o*Math.sqrt(3))*t+t;Zo(e,e,t,o,n,s)},x=[],mt=15,_n=Q(mt);for(let n=0;n<_n;n++)x.push($o(n,1,.5));const Fn=n=>{pn(x,10,mt,n)},mn=v({setup(n){return(t,o)=>(m(),M(w,{convert:d(Fn),colors:d(x)},null,8,["convert","colors"]))}}),dt=[{path:"/",name:"home",label:"\u8272\u5F69\u7684\u4E16\u754C",component:Lt},{path:"/rgb",name:"rgb",label:"\u5149\u7684\u4E09\u539F\u8272\uFF08RGB\u6A21\u578B\uFF09",component:to},{path:"/cmyk",name:"cmyk",label:"\u5370\u5237\u56DB\u8272\uFF08CMYK\u6A21\u578B\uFF09",component:lo},{path:"/twelve",name:"twelve",label:"\u5341\u4E8C\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:bo},{path:"/fortyeight",name:"fortyeight",label:"\u56DB\u5341\u516B\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:Ro},{path:"/ninetysix",name:"ninetysix",label:"\u4E5D\u5341\u516D\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:jo},{path:"/itten",name:"itten",label:"\u4F0A\u767B\u5341\u4E8C\u8272\u73AF\uFF08RYB\u6A21\u578B\uFF09",component:Xo},{path:"/palette",name:"palette",label:"\u8C03\u8272\u677F",component:en},{path:"/random",name:"random",label:"\u563F\uFF0C\u52A8\u8D77\u6765",component:fn},{path:"/progress",name:"progress",label:"\u6E10\u8FDB\u5F0F\u7684\u8C03\u8272\u677F",component:mn},{path:"/art",name:"art",label:"\u7F8E\u672F\u4E09\u539F\u8272\uFF08RYB\u6A21\u578B\u6D4B\u8BD5\u4E2D\uFF09",component:po}],dn=dt.map(({label:n,name:t})=>({label:n,value:t.toUpperCase()})),gn=$t({history:yt(),routes:dt});const vn=v({setup(n){et(l=>({de4ac442:a,e3b8717e:i}));const t=Mt(),o=wt(),s=L("HOME"),e=l=>{s.value=l,t.push({name:l.toLowerCase()})},r=C(()=>o.name||"home");nt(r,l=>{s.value=l.toUpperCase()});const c=180,a=`${c}px`,u=10,i=`${u}px`,_=()=>{const l=document.getElementById("app"),{width:h,height:p}=l.getBoundingClientRect();kt("rank",{width:h-c-2*u,height:p-2*u})};return T(()=>{_()}),(l,h)=>{const p=Ct("router-view");return m(),y(R,null,[G(St,{current:s.value,"catalog-list":d(dn),onChange:e},null,8,["current","catalog-list"]),G(p,{class:"container"})],64)}}});Bt(vn).use(gn).mount("#app");
