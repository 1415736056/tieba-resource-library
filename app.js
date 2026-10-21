(() => {
  'use strict';
  const data = window.RESOURCE_DATA;
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bookmark = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
  let favorites;
  try { favorites = new Set(JSON.parse(localStorage.getItem('shengyu-favorites-v1') || '[]')); }
  catch { favorites = new Set(); }
  let category = '全部', accountId = 'all', mode = 'all', selectedId = null, toastTimer;
  const query = new URLSearchParams(location.search);
  $('search').value = query.get('q') || '';
  if (data.categories.includes(query.get('cat'))) category = query.get('cat');
  const categories = ['全部', ...data.categories];
  if(data.accounts.some(a=>a.uid===query.get('account'))) accountId=query.get('account');
  $('account-filter').innerHTML='<option value="all">全部账号 · '+data.items.length+' 条</option>'+data.accounts.map(a=>`<option value="${escape(a.uid)}">${escape(a.display_name)} · ${a.postCount} 条</option>`).join('');
  $('account-filter').value=accountId;
  $('total-count').textContent=data.items.length+' 条记录';
  $('last-updated').textContent=data.collectedAt.replaceAll('-','.')+' 整理';
  $('account-summary').textContent=data.accounts.length+' 个账号 · 公开资源';
  $('coverage-intro').textContent=`本面板整理 ${data.accounts.length} 个账号的公开发帖记录。每条主帖都按内部 UID 核对楼主身份，公开昵称和用户名分别保留。`;
  $('archive-summary').textContent=`已核验 ${data.accounts.length} 个账号的 ${data.items.length} 条主帖，保留图文与来源。`;
  $('coverage-stats').innerHTML=[['核验主帖',data.items.length+' 条'],['保存图片',data.stats.images+' 张'],['独立链接',data.stats.uniqueLinks+' 个'],['采集日期',data.collectedAt]].map(([label,value])=>`<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('');
  $('coverage-accounts').innerHTML=data.accounts.map(a=>`<section class="coverage-account"><h3>${escape(a.display_name)} · ${a.postCount} 条主帖</h3><p>用户名 ${escape(a.username)}<br>内部 UID ${escape(a.uid)}${a.public_uid?'<br>公开 ID '+escape(a.public_uid):''}</p><p>${displayDate(a.firstPost)} 至 ${displayDate(a.lastPost)} · ${a.imageCount} 张图片${a.partialCount?' · '+a.partialCount+' 条采集有缺口':''}</p></section>`).join('');
  $('coverage-warning').textContent=data.stats.partial?`本次 ${data.stats.partial} 条帖子存在评论或图片缺口，详情页保留提示。《高桥和希游戏王全系列漫画》有一个楼层标注 37 条楼中楼，实际返回 27 条，原因尚未确认。`:'本次已保存接口返回的正文和图片，未发现已知详情缺口。';
  function displayDate(value, full = false) {
    if(!value || !Number.isFinite(new Date(value).getTime())) return '时间未知';
    const date = new Date(value);
    return new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',...(full ? {hour:'2-digit',minute:'2-digit',hour12:false}: {})}).format(date);
  }
  function toast(message) { clearTimeout(toastTimer); const toastHost=$('detail-dialog').open?$('detail-dialog'):document.body; if($('toast').parentElement!==toastHost)toastHost.append($('toast')); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => {$('toast').hidden = true;}, 2400); }
  function saveFavorites() { try { localStorage.setItem('shengyu-favorites-v1', JSON.stringify([...favorites])); } catch { toast('浏览器限制了本地存储，收藏暂时只保留在本次页面。'); } }
  function syncUrl() { const params = new URLSearchParams(); if ($('search').value.trim()) params.set('q',$('search').value.trim()); if(category !== '全部') params.set('cat',category); if(accountId!=='all') params.set('account',accountId); history.replaceState(null,'',location.pathname + (params.size?'?'+params:'') + location.hash); }
  function renderCategories() {
    const scoped=data.items.filter(r=>accountId==='all'||r.accountId===accountId);
    $('categories').innerHTML = categories.map(c => `<button class="category-button ${category===c?'active':''}" data-category="${escape(c)}" aria-pressed="${category===c}">${escape(c)}<span>${c==='全部'?scoped.length:scoped.filter(r=>r.category===c).length}</span></button>`).join('');
  }
  function render() {
    const text = $('search').value.trim().toLocaleLowerCase();
    let items = data.items.filter(r => (accountId==='all'||r.accountId===accountId) && (category==='全部'||r.category===category) && (mode!=='favorites'||favorites.has(r.tid)) && (!$('has-links').checked||r.links.length) && (!text||`${r.title} ${r.forum} ${r.body} ${r.category} ${r.authorName} ${r.username}`.toLocaleLowerCase().includes(text)));
    const sort = $('sort').value;
    items.sort((a,b) => sort==='popular' ? (b.replyCount??-1)-(a.replyCount??-1) : (new Date(a.createdAt)-new Date(b.createdAt))*(sort==='newest'?-1:1));
    $('result-count').textContent = `${mode==='favorites'?'我的收藏':accountId==='all'?'全部资源':data.accounts.find(a=>a.uid===accountId).display_name} · ${items.length} 条`;
    $('clear-search').hidden = !$('search').value;
    $('resource-list').hidden = !items.length;
    $('empty-state').hidden = !!items.length;
    $('empty-copy').textContent = mode==='favorites'&&!favorites.size ? '点资源右上角的收藏按钮，把想看的留在这里。' : '换个关键词，或者清除筛选再看看。';
    $('resource-list').innerHTML = items.map(r => `<article class="resource-row" data-tid="${r.tid}"><button class="cover-button" data-open="${r.tid}" aria-label="查看${escape(r.title)}">${r.thumb?`<img src="${r.thumb}" alt="${escape(r.title)}封面" loading="lazy" width="360" height="450">`:`<span class="cover-fallback">${escape(r.category[0])}</span>`}</button><div class="resource-info"><div class="resource-category"><span>${escape(r.category)}</span><span>${escape(r.forum)}吧</span>${r.partial?'<span class="partial-dot">采集有缺口</span>':''}</div><h2 class="resource-title"><button class="title-button" data-open="${r.tid}">${escape(r.title)}</button></h2><p class="account-source">${escape(r.authorName)}</p><p class="resource-summary">${escape(r.body.replace(/\s+/g,' ').slice(0,95))}</p><div class="resource-meta"><time datetime="${r.createdAt}">${displayDate(r.createdAt)}</time><span>${r.replyCount ?? '—'} 条回复</span></div><div class="resource-actions"><button class="small-button" data-open="${r.tid}">${r.links.length?'查看资源':'查看图文'}</button><span class="card-link-count">${r.links.length?r.links.length+' 个链接':'暂未提取到链接'}</span></div></div><div class="card-copy-tools" role="group" aria-label="分别复制${escape(r.title)}"><button data-copy-card="${r.tid}" data-copy-part="title">复制标题</button><button data-copy-card="${r.tid}" data-copy-part="body" ${r.body.trim()?'':'disabled'}>复制正文</button><button data-copy-card="${r.tid}" data-copy-part="pan" ${panLinks(r).length?'':'disabled'}>复制网盘链接</button></div><button class="card-favorite ${favorites.has(r.tid)?'saved':''}" data-favorite="${r.tid}" aria-label="${favorites.has(r.tid)?'取消收藏':'收藏'}${escape(r.title)}" aria-pressed="${favorites.has(r.tid)}">${bookmark}</button></article>`).join('');
    $('favorite-count').textContent = data.items.filter(r=>favorites.has(r.tid)).length;
    $('all-tab').classList.toggle('active',mode==='all');
    $('favorites-tab').classList.toggle('active',mode==='favorites');
    if(mode==='all') {$('all-tab').setAttribute('aria-current','page');$('favorites-tab').removeAttribute('aria-current');} else {$('favorites-tab').setAttribute('aria-current','page');$('all-tab').removeAttribute('aria-current');}
    renderCategories();
    syncUrl();
  }
  function toggleFavorite(id) { if(favorites.has(id)) favorites.delete(id); else favorites.add(id); saveFavorites(); render(); syncDetailFavorite(); }
  function syncDetailFavorite() { const saved = favorites.has(selectedId); $('detail-favorite').textContent = saved?'已收藏':'收藏'; $('detail-favorite').setAttribute('aria-pressed',String(saved)); $('detail-favorite').style.color = saved?'#167b91':''; }
  function openDetail(id, updateHash = true) {
    const r = data.items.find(item=>item.tid===id); if(!r) return;
    selectedId = id;
    const comments = r.comments.map(c=>`<p class="comment-body"><span class="comment-label">楼主回复</span>${escape(c.body)}</p>`).join('');
    $('detail-content').innerHTML = `<div class="detail-badges"><span>${escape(r.category)}</span><span>${escape(r.forum)}吧</span></div><h2 id="detail-title">${escape(r.title)}</h2><p class="detail-meta">${escape(r.authorName)} 发布于 ${displayDate(r.createdAt,true)}<span class="account-id">用户名 ${escape(r.username)} · UID ${escape(r.accountId)}</span>${r.replyCount??'—'} 条回复 · ${r.images.length} 张已保存图片</p><div class="detail-copy-tools" role="group" aria-label="复制资源内容"><button data-copy-field="title">复制标题</button><button data-copy-field="body" ${r.body.trim()?'':'disabled'}>复制正文</button><button data-copy-field="pan" ${panLinks(r).length?'':'disabled'}>复制网盘链接</button></div>${r.images.length?`<figure class="detail-hero"><button data-image="${r.images[0]}" aria-label="放大资源图片"><img src="${r.images[0]}" alt="${escape(r.title)}图片"></button>${r.images.length>1?`<div class="gallery-strip">${r.images.map((src,i)=>`<button data-image="${src}" aria-label="放大第${i+1}张图片"><img src="${src}" alt="第${i+1}张资源图片" loading="lazy"></button>`).join('')}</div>`:''}</figure>`:''}<h3 class="section-title">帖子正文</h3><p class="detail-body">${escape(r.body)}</p>${r.partial?'<p class="detail-note">'+escape(r.partialNote)+'</p>':''}<h3 class="section-title" id="resource-links-heading">资源链接 <span>(${r.links.length})</span></h3>${r.links.length?r.links.map((l,i)=>`<div class="link-box"><div class="link-box-top"><strong>${escape(l.provider==='QUARK'?'夸克网盘':l.provider==='BAIDU'?'百度网盘':'资源链接')}</strong><span>${l.code?'提取码 '+escape(l.code):'未附提取码'}</span></div><code>${escape(l.url)}</code><div class="link-box-actions"><button class="copy-button" data-copy="${i}">复制链接${l.code?'和提取码':''}</button><a class="open-link" href="${escape(l.url)}" target="_blank" rel="noopener noreferrer">打开链接</a></div></div>`).join('')+'<button class="copy-all-button" id="copy-all-links">复制全部资源链接</button>':'<p class="detail-body">这条记录暂未提取到楼主发布的资源链接，可打开原帖查看。</p>'}${comments?`<details class="target-comments"><summary>查看已采集的楼主回复 (${r.comments.length})</summary>${comments}</details>`:''}<div class="detail-bottom"><span>${displayDate(r.collectedAt||data.collectedAt)} 采集归档</span><a class="source-link" href="${r.sourceUrl}" target="_blank" rel="noopener noreferrer">查看贴吧原帖 ↗</a></div>`;
    if(!$('detail-dialog').open) $('detail-dialog').showModal();
    $('detail-dialog').scrollTop = 0;
    document.body.classList.add('dialog-open');
    syncDetailFavorite();
    if(updateHash) history.replaceState(null,'',location.pathname+location.search+'#post-'+id);
  }
  function closeDetail() { $('detail-dialog').close(); document.body.classList.remove('dialog-open'); selectedId=null; history.replaceState(null,'',location.pathname+location.search); }
  async function copy(value, message='已复制到剪贴板') {
    try {
      if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else { const input=document.createElement('textarea'); input.value=value; input.style.position='fixed'; input.style.opacity='0'; document.body.append(input); input.focus(); input.select(); const ok=document.execCommand('copy'); input.remove(); if(!ok) throw Error('COPY_FAILED'); }
      toast(message);
    } catch { toast('复制未成功，请长按链接文字复制'); }
  }
  function linkText(l) { return l.url+(l.code?'\n提取码：'+l.code:''); }
  function panLinks(r) { return r.links.filter(l=>l.isPan===true || (l.isPan==null && ['QUARK','BAIDU','ALIYUN','UC','XUNLEI','TIANYI','115','123PAN','LANZOU'].includes(l.provider))); }
  function copyField(r, field) { if(field==='title')copy(r.title,'标题已复制'); else if(field==='body')copy(r.body,'正文已复制'); else if(field==='pan')copy(panLinks(r).map(linkText).join('\n\n'),'网盘链接已复制'); }
  $('categories').addEventListener('click',event=>{const b=event.target.closest('[data-category]');if(b){category=b.dataset.category;render();}});
  $('resource-list').addEventListener('click',event=>{const copyButton=event.target.closest('[data-copy-card]');if(copyButton){const r=data.items.find(i=>i.tid===copyButton.dataset.copyCard);if(r)copyField(r,copyButton.dataset.copyPart);return;}const f=event.target.closest('[data-favorite]');if(f){toggleFavorite(f.dataset.favorite);return;}const b=event.target.closest('[data-open]');if(b) openDetail(b.dataset.open);});
  $('search').addEventListener('input',render);
  $('clear-search').addEventListener('click',()=>{$('search').value='';render();$('search').focus();});
  $('account-filter').addEventListener('change',()=>{accountId=$('account-filter').value;render();});
  $('sort').addEventListener('change',render); $('has-links').addEventListener('change',render);
  $('reset-filters').addEventListener('click',()=>{$('search').value='';category='全部';accountId='all';$('account-filter').value='all';$('has-links').checked=false;mode='all';render();});
  $('all-tab').addEventListener('click',()=>{mode='all';render();window.scrollTo({top:0,behavior:'smooth'});});
  $('favorites-tab').addEventListener('click',()=>{mode='favorites';render();window.scrollTo({top:0,behavior:'smooth'});});
  $('close-detail').addEventListener('click',closeDetail);
  $('detail-dialog').addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
  $('detail-favorite').addEventListener('click',()=>{if(selectedId)toggleFavorite(selectedId);});
  $('detail-content').addEventListener('click',event=>{
    const r=data.items.find(item=>item.tid===selectedId);if(!r)return;
    const fieldButton=event.target.closest('[data-copy-field]');if(fieldButton){copyField(r,fieldButton.dataset.copyField);return;}
    const b=event.target.closest('[data-copy]');if(b){copy(linkText(r.links[Number(b.dataset.copy)]));return;}
    if(event.target.closest('#copy-all-links')){copy(r.links.map(linkText).join('\n\n'),'资源链接已复制');return;}
    const image=event.target.closest('[data-image]');if(image){$('large-image').src=image.dataset.image;$('image-dialog').showModal();}
  });
  const openCoverage=()=>{$('coverage-dialog').showModal();};
  $('coverage-button').addEventListener('click',openCoverage);$('footer-coverage').addEventListener('click',openCoverage);$('close-coverage').addEventListener('click',()=>{$('coverage-dialog').close();});
  $('close-image').addEventListener('click',()=>{$('image-dialog').close();});
  for(const id of ['coverage-dialog','image-dialog']) $(id).addEventListener('click',event=>{if(event.target===$(id)&&event.clientX===0&&event.clientY===0)return;if(event.target===$(id)){const rect=$(id).getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)$(id).close();}});
  render();
  const post=location.hash.match(/^#post-(\d+)$/);if(post)openDetail(post[1],false);
})();
