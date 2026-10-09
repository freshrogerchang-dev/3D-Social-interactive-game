import json,collections
h=json.load(open('/tmp/s5-canvas.heap.json'));nf=h['snapshot']['meta']['node_fields']; ef=h['snapshot']['meta']['edge_fields'];nt=h['snapshot']['meta']['node_types'][0];et=h['snapshot']['meta']['edge_types'][0];ns=len(nf);es=len(ef);nodes=h['nodes'];edges=h['edges'];strings=h['strings'];
def typ(i):return nt[nodes[i+nf.index('type')]]
def name(i):return strings[nodes[i+nf.index('name')]]
canvases=[i for i in range(0,len(nodes),ns) if name(i).startswith('<canvas ') and typ(i) == 'native']
parents=collections.defaultdict(list);pos=0
for src in range(0,len(nodes),ns):
 for j in range(nodes[src+nf.index('edge_count')]):
  e=pos+j*es;t=et[edges[e+ef.index('type')]];idx=edges[e+ef.index('name_or_index')];target=edges[e+ef.index('to_node')]
  if t!='weak':parents[target].append((src,str(idx) if t in ['element','hidden'] else strings[idx],t))
 pos+=nodes[src+nf.index('edge_count')]*es
print('canvas nodes:',len(canvases),collections.Counter(name(i) for i in canvases))
for target in canvases[:3]:
 print('\nTARGET',typ(target),name(target),'heapid',nodes[target+nf.index('id')]); print('DIRECT PARENTS',[(typ(src),name(src),edge,t) for src,edge,t in parents[target][:12]])
 q=collections.deque([(target,[])]);seen={target};found=0
 while q and found<3:
  cur,trail=q.popleft()
  if len(trail)>40:continue
  for src,edge,t in parents[cur]:
   if src in seen:continue
   seen.add(src);new=[{'type':typ(src),'name':name(src),'edge':edge,'edgeType':t}]+trail
   if typ(src)=='synthetic':print('ROOT PATH',json.dumps(new));found+=1
   else:q.append((src,new))
