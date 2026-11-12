import os, pathlib, json, subprocess, selectors, time, signal
OUT=pathlib.Path(__file__).parent
PACKAGES=['qs-skills','qs-specialists','qs-advanced','qs-frontend','qs-video','qs-execution']
def rpc(label,args,requests):
    rec={'argv':args,'cwd':'/github/skills','environmentOverrides':{},'requests':[],'stdout':[],'stderr':[],'modelRequests':0}
    p=subprocess.Popen(args,cwd='/github/skills',stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
    sel=selectors.DefaultSelector(); pending={}
    for stream,name in [(p.stdout,'stdout'),(p.stderr,'stderr')]: sel.register(stream,selectors.EVENT_READ,name);pending[name]=b''
    try:
      for req in requests:
        rec['requests'].append(req);p.stdin.write((json.dumps(req)+'\n').encode());p.stdin.flush()
        if 'id' not in req and req.get('type')!='control_request':continue
        deadline=time.monotonic()+20;found=False
        while time.monotonic()<deadline and not found:
          for key,_ in sel.select(.2):
            b=os.read(key.fileobj.fileno(),65536)
            if not b:sel.unregister(key.fileobj);continue
            name=key.data;pending[name]+=b
            while b'\n' in pending[name]:
              line,pending[name]=pending[name].split(b'\n',1);line=line.decode(errors='replace')
              rec[name].append(line)
              if name=='stdout':
                try:
                  data=json.loads(line)
                  if data.get('id')==req.get('id') and 'id' in req:found=True
                  if data.get('type')=='control_response':found=True
                except ValueError:pass
          if p.poll() is not None:break
        if not found:rec['blocker']='No response before exit or 20 second deadline';break
    except Exception as e:rec['exception']=repr(e)
    finally:
      p.stdin.close()
      if p.poll() is None:os.killpg(p.pid,signal.SIGTERM)
      try:tail=p.communicate(timeout=3)
      except subprocess.TimeoutExpired:
        os.killpg(p.pid,signal.SIGKILL);p.wait();tail=(b'',b'')
      except ValueError: p.wait(timeout=3);tail=(p.stdout.read(),p.stderr.read())
      for name,buf in zip(['stdout','stderr'],tail):
        if pending[name] or buf:rec[name].append((pending[name]+buf).decode(errors='replace'))
      rec['exitCode']=p.returncode
      (OUT/(label+'.json')).write_text(json.dumps(rec,indent=2)+'\n')
      print(label,rec.get('blocker','replied'),len(rec['stdout']),len(rec['stderr']))

if __name__=='__main__':
 import sys
 if sys.argv[1]=='codex':
  stage=OUT/'source-fixture'; skills=stage/'.agents/skills';skills.mkdir(parents=True,exist_ok=True)
  bindings=[]
  for pkg in PACKAGES:
   for skill in (pathlib.Path('/github/skills/codex/plugins')/pkg/'skills').iterdir():
    if not skill.is_dir():continue
    link=skills/skill.name
    if not link.exists():link.symlink_to(skill,target_is_directory=True)
    bindings.append({'path':str(link.resolve()),'name':skill.name,'source':'/github/skills/codex/plugins/'+pkg+'/skills/'+skill.name})
  (OUT/'staged-source-bindings.json').write_text(json.dumps(bindings,indent=2)+'\n')
  rpc('codex-active-source',['codex','app-server','--listen','stdio://'],[{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'clientInfo':{'name':'qs-lex12-active-source','version':'1'},'capabilities':{'experimentalApi':True}}},{'jsonrpc':'2.0','method':'initialized','params':{}},{'jsonrpc':'2.0','id':2,'method':'skills/list','params':{'cwds':[str(stage.resolve())],'forceReload':True}}])
 elif sys.argv[1]=='pi':
  args=['pi','--mode','rpc','--no-session','--offline']
  for name in PACKAGES:args+=['--skill','/github/skills/pi/packages/'+name+'/skills']
  rpc('pi-current-cli',args,[{'id':'lex-discovery','type':'get_commands'}])
