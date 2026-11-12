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
  requests=[{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'clientInfo':{'name':'qs-lex-source-discovery','version':'1'},'capabilities':{'experimentalApi':True}}},{'jsonrpc':'2.0','method':'initialized','params':{}}]
  marketplace='/github/skills/codex/.agents/plugins/marketplace.json' if len(sys.argv)>2 and sys.argv[2]=='corrected' else '/github/skills/codex'
  requests += [{'jsonrpc':'2.0','id':i+2,'method':'plugin/read','params':{'marketplacePath':marketplace,'pluginName':name}} for i,name in enumerate(PACKAGES)]
  requests += [{'jsonrpc':'2.0','id':20,'method':'skills/list','params':{'cwds':['/github/skills/codex/plugins/'+name for name in PACKAGES],'forceReload':True}}]
  label='codex-native-source-'+sys.argv[2] if len(sys.argv)>2 else 'codex-native-source'
  rpc(label,['codex','app-server','--listen','stdio://'],requests)
 elif sys.argv[1] in ['claude','claude-control','claude-repeat','claude-debug']:
  args=['claude','--print','--input-format','stream-json','--output-format','stream-json','--verbose','--no-session-persistence']
  if sys.argv[1]=='claude-debug':args+=['--debug-file',str(OUT/'claude-native-loader.debug')]
  if sys.argv[1]!='claude-control':
   for name in PACKAGES:args+=['--plugin-dir','/github/skills/packages/'+name]
  label='claude-native-source' if sys.argv[1]=='claude' else sys.argv[1]
  rpc(label,args,[{'type':'control_request','request_id':'lex-discovery-init','request':{'subtype':'initialize'}}])
 elif sys.argv[1]=='pi':
  args=['pi','--mode','rpc','--no-session','--offline']
  for name in PACKAGES:args+=['--skill','/github/skills/pi/packages/'+name+'/skills']
  rpc('pi-native-source',args,[{'id':'lex-discovery','type':'get_commands'}])
