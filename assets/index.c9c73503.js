import{d as b,t as tt,o as m,c as $,F as L,r as j,u as F,n as I,a as R,b as bt,e as M,f as A,g as G,w as ot,h as T,i as yt,j as $t,k as Mt,l as nt,m as N,p as et,q as w,s as wt,v as Ct,x as kt,y as Bt,z as At,A as Pt,B as qt}from"./vendor.affadc1c.js";const St=function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const r of e)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&s(c)}).observe(document,{childList:!0,subtree:!0});function o(e){const r={};return e.integrity&&(r.integrity=e.integrity),e.referrerpolicy&&(r.referrerPolicy=e.referrerpolicy),e.crossorigin==="use-credentials"?r.credentials="include":e.crossorigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(e){if(e.ep)return;e.ep=!0;const r=o(e);fetch(e.href,r)}};St();const Rt={class:"side"},Tt=["onClick"],Et=b({props:{catalogList:null,current:null},emits:["change"],setup(n,{emit:t}){const s=tt(n).catalogList,e=r=>{t("change",r)};return(r,c)=>(m(),$("div",Rt,[(m(!0),$(L,null,j(F(s),({label:a,value:i})=>(m(),$("div",{key:i,class:I({"side-content":!0,"side-content-active":n.current===i}),onClick:u=>e(i)},R(a),11,Tt))),128))]))}});var Lt=(n,t)=>{const o=n.__vccOpts||n;for(const[s,e]of t)o[s]=e;return o};const Gt={},Dt={class:"color-wrap"},Ht=bt('<div class="logo"><a href="/favicon.ico">Color Ring</a></div><div class="color-wrap-content"><p>\u8FD9\u662F\u4EC0\u4E48\uFF1F</p><p>\u6211\u60F3\u7528\u81EA\u5DF1\u7684\u65B9\u5F0F\uFF0C\u8BB2\u8BB2\u8272\u5F69\u7684\u4E16\u754C\uFF0C\u89C1\u8BC6\u4E0B\u795E\u5947\u7684\u989C\u8272\uFF0C\u628A\u90A3\u4E9B\u8BA9\u4EBA\u7740\u8FF7\u7684\u6570\u5B66\u6A21\u578B\uFF0C\u7ED3\u5408\u4E30\u5BCC\u7684\u8272\u5F69\u5C55\u793A\u51FA\u6765\u3002</p><p>\u4EC5\u4F5C\u4E3A\u4E2A\u4EBA\u5174\u8DA3\u7684\u5B9E\u9A8C\u54C1\uFF0C\u4E0D\u5177\u6709\u4EFB\u4F55\u5B66\u672F\u6027\uFF0C\u5982\u679C\u6709\u4EFB\u4F55\u7455\u75B5\uFF0C\u8BF7\u4E00\u5B9A\u5E2E\u5FD9\u6307\u51FA\uFF0C\u975E\u5E38\u611F\u8C22\u3002</p></div><div class="color-wrap-footer"> \u672C\u6587\u7684\u535A\u5BA2\u5730\u5740\uFF1A<a href="https://juejin.cn/post/7047529302140649486">\u6C34\u9CDC\u9C7C\u80A5</a></div>',3),Wt=[Ht];function jt(n,t){return m(),$("div",Dt,Wt)}var It=Lt(Gt,[["render",jt]]);class y{constructor(t=[0,0,0],o=1){if(this._rgb=[0,0,0],this._alpha=0,Array.isArray(t))this._rgb=t;else{const s=t.match(/^#/g)?t.slice(1):t,e=[],r=s.length>=6?s.match(/.{2}/g):s.split("");r==null||r.forEach((c,a)=>{const i=parseInt(s.length>=6?c:c+c,16);a<3?e.push(i):this._alpha=i/255}),this._rgb=e}this._alpha=this._alpha||(typeof o=="number"?o:1)}rgb(){return this._rgb}rgba(){const{0:t,1:o,2:s}=this.rgb();return{r:t,g:o,b:s,a:this.alpha()}}alpha(){return this._alpha}toRGB(){return this.toHex(this._rgb)}toRGBA(){return this.toHex(this._rgb.concat([this._alpha*255]))}toHex(t=this._rgb){const o=[];return t.forEach(s=>{const e=Math.min(Math.max(Math.round(s),0),255);o.push(e.toString(16).padStart(2,"0"))}),`#${o.join("").toLowerCase()}`}toHSL(){const{0:t,1:o,2:s}=this._rgb,e=Math.max(t,o,s),r=Math.min(t,o,s),c=(e+r)/2/255,a=e-r;let i=0,u=0;if(e===r)u=0,i=0;else switch(i=c>.5?a/(2*255-e-r):a/(e+r),e){case t:u=(o-s)/a*60;break;case o:u=(s-t)/a*60+120;break;case s:u=(t-o)/a*60+240;break}return u<0&&(u+=360),{h:Math.round(u),s:i,l:Math.ceil(c*1e3)/1e3,a:this._alpha}}toHSV(){const{0:t,1:o,2:s}=this._rgb,e=Math.max(t,o,s),r=Math.min(t,o,s),c=Math.ceil(e/255*1e3)/1e3,a=e-r,i=e===0?0:a/e;let u=0;if(e===r)u=0;else switch(e){case t:u=(o-s)/a*60;break;case o:u=(s-t)/a*60+120;break;case s:u=(t-o)/a*60+240;break}return u<0&&(u+=360),{h:Math.round(u),s:i,v:c,a:this._alpha}}toCMYK(){const{0:t,1:o,2:s}=this._rgb,e=Math.max(t,o,s)/255;if(e===0)return{c:0,m:0,y:0,k:1};const r=1-e,c=(e-t/255)/e,a=(e-o/255)/e,i=(e-s/255)/e;return{c,m:a,y:i,k:r}}}const Nt={class:"color-detail"},Ot={class:"color-detail-table"},Ut={class:"color-detail-title"},Vt={class:"color-detail-code"},Yt=b({props:{color:null},setup(n){const o=tt(n).color,s=M(()=>o.value.toHex().toUpperCase()),e=M(()=>o.value.rgb().join(", ")),r=M(()=>{const _=[];return o.value.rgb().forEach(l=>{const p=Math.round(l*100/255);_.push(`${p}%`)}),_.join(", ")}),c=M(()=>{const{h:_,s:l,l:p}=o.value.toHSL();return[_,`${l*100}%`,`${p*100}`].join(", ")}),a=M(()=>{const{h:_,s:l,v:p}=o.value.toHSV();return[`${_}\xB0`,`${l*100}`,`${p*100}`].join(", ")}),i=M(()=>{const{c:_,m:l,y:p,k:f}=o.value.toCMYK();return`${_*100}, ${l*100}, ${p*100}, ${f}`}),u=M(()=>[{label:"Hex triplet",code:s.value},{label:"RGB Decimal",code:`rgb(${e.value})`},{label:"RGB Percent",code:`rgb(${r.value})`},{label:"CMYK",code:i.value},{label:"HSL",code:`hsl(${c.value})`},{label:"HSV(or HSB)",code:a.value}]);return(_,l)=>(m(),$("div",Nt,[A("table",Ot,[A("tbody",null,[(m(!0),$(L,null,j(F(u),({label:p,code:f},g)=>(m(),$("tr",{key:g},[A("th",Ut,R(p),1),A("td",Vt,[A("code",null,R(f),1)])]))),128))])])]))}});const Kt={class:"color-list"},zt={class:"color-list-wrap"},Jt=["onClick"],Xt=b({props:{colors:null,color:null},setup(n){const t=n,o=G(t.color),s=e=>{o.value=e};return ot(()=>t.color,e=>{o.value=e},{deep:!0}),(e,r)=>(m(),$("div",Kt,[T(Yt,{color:o.value},null,8,["color"]),A("div",zt,[(m(!0),$(L,null,j(n.colors,(c,a)=>(m(),$("div",{key:a,class:I({"color-cell":!0,"color-cell-active":n.color.toHex()===c.toHex()}),style:yt({backgroundColor:c.toRGB()}),onClick:i=>s(c)},R(c.toRGB().toUpperCase()),15,Jt))),128))])]))}}),Qt=(n,t,o)=>{const e=`image/${["jpeg","jpg"].includes(t)?"jpeg":"png"}`,r=n.toDataURL(e),c=document.createElement("a");c.setAttribute("download",o),c.setAttribute("href",r),c.setAttribute("target","_blank"),c.click()};const Zt=b({props:{label:{type:String,default:"\u63D0\u4EA4"},disabled:{type:Boolean,default:!1}},setup(n){return(t,o)=>(m(),$("button",{class:I(["color-button",{disabled:n.disabled}])},[$t(t.$slots,"default",{},()=>[Mt(R(n.label),1)])],2))}});const xt={class:"base-canvas"},C=b({props:{beforeConvert:{type:Function,default:()=>{}},convert:{type:Function,default:()=>{}},afterConvert:{type:Function,default:()=>{}},colors:{type:Array,default:()=>[]}},setup(n){const t=n;nt(f=>({"34930678":a}));const o=G(null),{width:s,height:e}=N("rank");let r=document.createElement("canvas");const c=390,a=`${c}px`,i=G(new y),u=()=>{r=o.value,r.width=s-c,r.height=e;const f=r.getContext("2d");t.beforeConvert(f),t.convert(f),t.afterConvert(f)},_=f=>{const g=W=>W.toString(16).padStart(2,"0"),{0:k,1:B,2:S,3:q}=f.data;return`#${g(k)}${g(B)}${g(S)}${g(q)}`.toUpperCase()},l=f=>{const{offsetX:g,offsetY:k}=f;if(g<0||k<0)return;const S=r.getContext("2d").getImageData(g,k,1,1),q=_(S);i.value=new y(q),navigator.clipboard.writeText(q)},p=()=>{Qt(r,"png","nannn")};return et(()=>{u()}),(f,g)=>(m(),$("div",xt,[A("canvas",{class:"base-canvas-center",ref_key:"canvasRef",ref:o,onClick:l},null,512),T(Xt,{colors:n.colors,color:i.value},null,8,["colors","color"]),T(F(Zt),{class:"download",u:"primary",label:"\u4E0B\u8F7D",onClick:p})]))}}),D=120,P=100,to=(n,t,o)=>[{x:P+D/2,y:P,color:n},{x:P,y:P+Math.sqrt(3)*D/2,color:t},{x:P+D,y:P+Math.sqrt(3)*D/2,color:o}],st=(n,t,o,s)=>{to(n,t,o).forEach(({x:r,y:c,color:a})=>{s.beginPath(),s.arc(r,c,P,0,2*Math.PI),s.fillStyle=a,s.fill()})},rt="#FF0000",ct="#00FF00",at="#0000FF",oo="#ffff00",no="#00ffff",eo="#ff00ff",so="#FFFFFF",ro=[rt,oo,ct,no,at,eo,so],co=ro.map(n=>new y(n)),ao=n=>{n.globalCompositeOperation="screen",st(rt,ct,at,n)},lo=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(ao),colors:F(co)},null,8,["convert","colors"]))}}),lt="#FF0000",it="#00FF00",ut="#0000FF",io="#ffff00",uo="#00ffff",ho="#ff00ff",fo="#FFFFFF",po=[lt,io,it,uo,ut,ho,fo],_o=po.map(n=>new y(n)),mo=n=>{const{width:t,height:o}=N("rank");n.globalCompositeOperation="difference",st(lt,it,ut,n),n.beginPath(),n.fillStyle="white",n.fillRect(0,0,t,o)},Fo=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(mo),colors:F(_o)},null,8,["convert","colors"]))}});const vo=20,go=200,bo=10,O=(n,t=1,o,s)=>{var l,p;if(!n.length||t<1)return;const e=(l=s==null?void 0:s.width)!=null?l:vo,r=(p=s==null?void 0:s.minr)!=null?p:go,c=r+e*t+bo,a=c,i=2*Math.PI/n.length,u=(Math.PI+i)/2;o.lineWidth=e;const _=f=>{n.forEach((g,k)=>{const B=k*i-u,S=B+i,q=1-.1*(f-1),W=r+e*(t-f),gt=new y(g.rgb(),q);o.beginPath(),o.strokeStyle=gt.toRGBA(),o.arc(c,a,W,B,S),o.stroke(),o.closePath()})};for(let f=1;f<=t;f++)_(f)},yo=["#FF0000","#FF8000","#FFFF00","#80FF00","#00FF00","#00FF80","#00FFFF","#0080FF","#0000FF","#8000FF","#FF00FF","#FF0080"],ht=yo.map(n=>new y(n)),$o=n=>{O(ht,1,n,{minr:200,width:40})},Mo=b({setup(n){return(t,o)=>(m(),w(C,{convert:F($o),colors:F(ht)},null,8,["convert","colors"]))}}),U=(n,t,o=.5)=>{const{r:s,g:e,b:r,a:c}=n.rgba(),{r:a,g:i,b:u,a:_}=t.rgba(),l=o*2-1,p=c-_,f=((l*p==-1?l:(l+p)/(1+l*p))+1)/2,g=1-f,k=[Math.round(s*f+a*g),Math.round(e*f+i*g),Math.round(r*f+u*g)],B=c*o+_*(1-o);return new y(k,B)},V=(n,t=1,o=U)=>{const s=n.length;if(t<1||s<2)return n;const e=.5,r=[];return n.forEach((c,a)=>{r.push(c);const i=a+1<s?a+1:0;if(i!==a-1){const u=o(c,n[i],e);r.push(u)}}),t--,t?V(r,t,o):r},wo=(n,t,o)=>Co(n,t,o,1),Co=(n,t,o,s)=>{let e=0,r=0,c=0;if(t===0)e=o,r=o,c=o;else{const a=o<.5?o*(1+t):o+t-o*t,i=2*o-a,u=n/360,_=l=>{l<0?l=l+1:l>1&&(l=l-1);let p=0;return l<1/6?p=i+(a-i)*6*l:l<1/2?p=a:l<2/3?p=i+(a-i)*6*(2/3-l):p=i,p};e=_(u+1/3),r=_(u),c=_(u-1/3)}return new y([e*255,r*255,c*255],s)},ko="#FF0000",Bo="#00FF00",Ao="#0000FF",Po="#ffff00",qo="#00ffff",So="#ff00ff",Ro=[ko,Po,Bo,qo,Ao,So],To=Ro.map(n=>new y(n)),ft=V(To,3,U),Eo=n=>{const{width:t,height:o}=N("rank");n.beginPath(),n.fillStyle="transparent",n.fillRect(0,0,t,o),O(ft,1,n,{minr:200,width:40})},Lo=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(Eo),colors:F(ft)},null,8,["convert","colors"]))}}),Go="#FF0000",Do="#00FF00",Ho="#0000FF",Wo="#ffff00",jo="#00ffff",Io="#ff00ff",No=[Go,Wo,Do,jo,Ho,Io],Oo=No.map(n=>new y(n)),pt=V(Oo,4,U),Uo=n=>{O(pt,10,n,{minr:160,width:20})},Vo=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(Uo),colors:F(pt)},null,8,["convert","colors"]))}}),Yo=["#FFFF00","#FFAA00","#FF8000","#FF5500","#FF0000","#FF0080","#FF00FF","#8080FF","#0080FF","#00FFFF","#00FF00","#80FF00"],E=Yo.map(n=>new y(n)),Y=40,K=200,Ko=10,d=K+Y+Ko,v=d,z=2*Math.PI/E.length,h=K-Y/2,zo=(n,t)=>{const o=(Math.PI+z)/2;t.lineWidth=Y,n.forEach((s,e)=>{const r=e*z-o,c=r+z;t.beginPath(),t.strokeStyle=s.toRGBA(),t.arc(d,v,K,r,c),t.stroke(),t.closePath()})},Jo=(n,t)=>{const[o,s,e]=n;t.lineWidth=1,t.beginPath(),t.fillStyle=o.toRGBA(),t.moveTo(d,v),t.lineTo(d-h*Math.sqrt(3)/4,v-h/4),t.lineTo(d,v-h),t.lineTo(d+h*Math.sqrt(3)/4,v-h/4),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.moveTo(d,v),t.lineTo(d+h*Math.sqrt(3)/4,v-h/4),t.lineTo(d+h*Math.sqrt(3)/2,v+h/2),t.lineTo(d,v+h/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=e.toRGBA(),t.moveTo(d,v),t.lineTo(d-h*Math.sqrt(3)/4,v-h/4),t.lineTo(d-h*Math.sqrt(3)/2,v+h/2),t.lineTo(d,v+h/2),t.fill(),t.closePath()},Xo=(n,t)=>{const[o,s,e]=n;t.lineWidth=1,t.beginPath(),t.fillStyle=o.toRGBA(),t.lineTo(d,v-h),t.lineTo(d+h*Math.sqrt(3)/2,v+h/2),t.lineTo(d+h*Math.sqrt(3)/2,v-h/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.lineTo(d+h*Math.sqrt(3)/2,v+h/2),t.lineTo(d-h*Math.sqrt(3)/2,v+h/2),t.lineTo(d,v+h),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=e.toRGBA(),t.lineTo(d-h*Math.sqrt(3)/2,v+h/2),t.lineTo(d,v-h),t.lineTo(d-h*Math.sqrt(3)/2,v-h/2),t.fill(),t.closePath()},Qo=n=>{zo(E,n),Jo(E.filter((t,o)=>[0,4,8].includes(o)),n),Xo(E.filter((t,o)=>[2,6,10].includes(o)),n)},Zo=b({setup(n){return(t,o)=>(m(),w(C,{class:"itten",convert:F(Qo),colors:F(E)},null,8,["convert","colors"]))}}),xo=(n,t,o)=>[{x:n+o/2,y:t-o*Math.sqrt(3)/2},{x:n+o,y:t},{x:n+o/2,y:t+o*Math.sqrt(3)/2},{x:n-o/2,y:t+o*Math.sqrt(3)/2},{x:n-o,y:t},{x:n-o/2,y:t-o*Math.sqrt(3)/2}],tn=(n,t,o,s=1)=>{if(s===0)return[{x:n,y:t}];const e=[],r=[],c=[],a=[],i=[],u=[];for(let l=1;l<=s;l++)e.push({x:n+l*o*3/2,y:t-s*o*Math.sqrt(3)+l*o*Math.sqrt(3)/2}),r.push({x:n+s*o*3/2,y:t+s*o*Math.sqrt(3)/2-(s-l)*o*Math.sqrt(3)}),c.push({x:n+(s-l)*o*3/2,y:t+s*o*Math.sqrt(3)-(s-l)*o*Math.sqrt(3)/2}),a.push({x:n-l*o*3/2,y:t+s*o*Math.sqrt(3)-l*o*Math.sqrt(3)/2}),i.push({x:n-s*o*3/2,y:t+s*o*Math.sqrt(3)/2-l*o*Math.sqrt(3)}),u.push({x:n-(s-l)*o*3/2,y:t-s*o*Math.sqrt(3)+(s-l)*o*Math.sqrt(3)/2});return e.concat(r,c,a,i,u)},J=(n,t,o,s=1)=>{let e=[];for(let r=0;r<=s;r++){const c=tn(n,t,o,r);e=e.concat(c)}return e},X=(n,t,o,s,e)=>{const r=xo(n,t,o);e.beginPath(),r.forEach(({x:c,y:a},i)=>{i===0?e.moveTo(c,a):e.lineTo(c,a)}),e.fillStyle=s.toRGBA(),e.fill(),e.closePath()},Q=(n=1)=>new Array(n).fill("").map((s,e)=>(e+1)*6).reduce((s,e)=>s+e,1),on=(n,t,o,s=1,e,r)=>{J(n,t,o,s).forEach(({x:a,y:i},u)=>{const _="#"+Math.floor(Math.random()*16777215).toString(16),l=e[u]||new y(_);X(a,i,o,l,r)})},nn=(n,t,o,s=1,e)=>{const r=(s+1)*o*Math.sqrt(3);e.beginPath(),[{x:n+r*Math.sqrt(3)/2,y:t-r/2},{x:n+r*Math.sqrt(3)/2,y:t+r/2},{x:n,y:t+r},{x:n-r*Math.sqrt(3)/2,y:t+r/2},{x:n-r*Math.sqrt(3)/2,y:t-r/2},{x:n,y:t-r}].forEach(({x:a,y:i},u)=>{u===0?e.moveTo(a,i):e.lineTo(a,i)}),e.fillStyle="#000000",e.fill(),e.closePath()},en=(n,t,o=1,s)=>{const e=(1+o*Math.sqrt(3))*t+t,r=e;nn(e,r,t,o,s),J(e,r,t,o).forEach(({x:a,y:i},u)=>{X(a,i,t,n[u],s)})},_t=8,sn=Q(_t);let H=[];for(let n=0;n<sn;n++){const t=Math.floor(Math.random()*4095);H.push(t)}H=H.sort((n,t)=>t-n);const dt=H.map(n=>new y(`#${n.toString(16).padStart(3,"0")}`)),rn=n=>{en(dt,25,_t,n)},cn=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(rn),colors:F(dt)},null,8,["convert","colors"]))}}),an=n=>{const t=[];for(let o=1;o<=n;o++)t.push(o);return t},ln=(n,t)=>{const o=an(n),s=[];let e=1;for(;o.length>0;){const r=[];for(let c=0;c<Math.min(e,t)&&o.length!==0;c++){const a=Math.floor(Math.random()*o.length);r.push(o[a]-1),o.splice(a,1)}s.push(r),e++}return s},un=(n,t,o,s,e)=>{s.forEach(({x:r,y:c})=>{const a="#"+Math.floor(Math.random()*16777215).toString(16);mt.push(new y(a)),X(r,c,o,new y(a),e)})},mt=[],Z=10,hn=Q(Z),fn=ln(hn,6),pn=100,_n=n=>{const t=20,o=(1+Z*Math.sqrt(3))*t+t,s=o,e=J(o,s,t,Z);fn.forEach((r,c)=>{setTimeout(()=>{const a=r.map(i=>e[i]);un(o,s,t,a,n)},c*pn)})},dn=b({setup(n){const t=M(()=>mt);return(o,s)=>(m(),w(C,{convert:F(_n),colors:F(t)},null,8,["convert","colors"]))}}),mn=(n,t,o=1,s)=>{const e=(1+o*Math.sqrt(3))*t+t;on(e,e,t,o,n,s)},x=[],Ft=15,Fn=Q(Ft);for(let n=0;n<Fn;n++)x.push(wo(n,1,.5));const vn=n=>{mn(x,10,Ft,n)},gn=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(vn),colors:F(x)},null,8,["convert","colors"]))}}),vt=[{path:"/",name:"home",label:"\u8272\u5F69\u7684\u4E16\u754C",component:It},{path:"/rgb",name:"rgb",label:"\u5149\u7684\u4E09\u539F\u8272\uFF08RGB\u6A21\u578B\uFF09",component:lo},{path:"/cmyk",name:"cmyk",label:"\u5370\u5237\u56DB\u8272\uFF08CMYK\u6A21\u578B\uFF09",component:Fo},{path:"/twelve",name:"twelve",label:"\u5341\u4E8C\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:Mo},{path:"/fortyeight",name:"fortyeight",label:"\u56DB\u5341\u516B\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:Lo},{path:"/ninetysix",name:"ninetysix",label:"\u4E5D\u5341\u516D\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:Vo},{path:"/itten",name:"itten",label:"\u4F0A\u767B\u5341\u4E8C\u8272\u73AF\uFF08RYB\u6A21\u578B\uFF09",component:Zo},{path:"/palette",name:"palette",label:"\u8C03\u8272\u677F",component:cn},{path:"/random",name:"random",label:"\u563F\uFF0C\u52A8\u8D77\u6765",component:dn},{path:"/progress",name:"progress",label:"\u6E10\u8FDB\u5F0F\u7684\u8C03\u8272\u677F",component:gn}],bn=vt.map(({label:n,name:t})=>({label:n,value:t.toUpperCase()})),yn=wt({history:Ct("/color-ring/"),routes:vt});const $n=b({setup(n){nt(l=>({de4ac442:a,e3b8717e:u}));const t=kt(),o=Bt(),s=G("HOME"),e=l=>{s.value=l,t.push({name:l.toLowerCase()})},r=M(()=>o.name||"home");ot(r,l=>{s.value=l.toUpperCase()});const c=180,a=`${c}px`,i=10,u=`${i}px`,_=()=>{const l=document.getElementById("app"),{width:p,height:f}=l.getBoundingClientRect();Pt("rank",{width:p-c-2*i,height:f-2*i})};return et(()=>{_()}),(l,p)=>{const f=At("router-view");return m(),$(L,null,[T(Et,{current:s.value,"catalog-list":F(bn),onChange:e},null,8,["current","catalog-list"]),T(f,{class:"container"})],64)}}});qt($n).use(yn).mount("#app");
