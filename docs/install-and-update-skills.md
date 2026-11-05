# Install and update QuickStark skills

## Restart Codex after an update

<!-- quickstark-codex-restart:start -->
### Copy/paste restart script

Run this on the server host as the account that runs Codex, after active work
finishes. Copy the entire block into Bash or zsh. Node and Codex must be on PATH.
It uses Codex's native restart on Linux/macOS, or preserves the existing detached
GMK Linux launch. It finds the PID itself, excludes proxies and verifies Codex
responds afterward. Unsupported or uncertain launchers stop with an error.

It keeps the existing setup; there is no migration, installation or settings
rewrite. For a custom profile, set `CODEX_HOME` first. To inspect without
restarting, add `--check` after the `-` on the first line. Native version queries
may clean stale daemon PID metadata. Actual Mac execution remains unverified.

<details>
<summary>Copy the restart script</summary>

```bash
node --input-type=module - <<'QUICKSTARK_RESTART'
#!/usr/bin/env node
// Standalone module: documentation embeds this file verbatim.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const exec=promisify(execFile),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class Refusal extends Error {}
const stop=message=>{throw new Refusal(message);};
const same=(a,b)=>Boolean(a&&b&&a.pid===b.pid&&a.start===b.start&&a.exe===b.exe);
const socketFor=home=>path.join(home,'app-server-control','app-server-control.sock');
const help=`Restart Codex on its server host, as its existing account.
Usage: node restart-codex.mjs [--check] [--codex-home PATH]
Supports Codex-managed daemons on Linux/macOS and the known detached Linux
launch: codex -c features.code_mode_host=true app-server --listen unix://
--check inspects without restarting. --help shows this help.
Finish active work first. Uncertain targets stop without a restart.`;

export function options(args,env=process.env) {
  const result={home:env.CODEX_HOME||path.join(env.HOME||os.homedir(),'.codex')};
  const seen=new Set();
  for(let i=0;i<args.length;i++) {
    const arg=args[i];if(seen.has(arg))stop('Duplicate option. Use --help.');seen.add(arg);
    if(arg==='--help')result.help=true;
    else if(arg==='--check')result.check=true;
    else if(arg==='--codex-home'&&args[i+1]&&!args[i+1].startsWith('--'))result.home=args[++i];
    else stop('Unknown or incomplete option. Use --help.');
  }
  result.home=path.resolve(result.home);return result;
}
function ready(version,home) {
  return version?.status==='running'&&version.socketPath===socketFor(home)&&typeof version.appServerVersion==='string'&&version.appServerVersion.length>0;
}
export async function main(args=process.argv.slice(2),{world,output=console.log,environment=process.env}={}) {
  let unlock,plan,changed=false;
  try {
    const opts=options(args,environment);if(opts.help){output(help);return 0;}
    world??=await systemWorld(opts.home,environment);
    if(!opts.check)unlock=await world.lock();
    const version=await world.version();
    if(!ready(version,world.home))stop('Codex did not respond on the selected profile socket. No restart attempted.');
    if(version.backend==='pid') {
      if(opts.check){output('Codex-managed server found. No restart performed.');return 0;}
      changed=true;await world.nativeRestart();
      const after=await world.version();
      if(!ready(after,world.home)||after.backend!=='pid')stop('Native restart returned, but Codex readiness was not verified.');
    } else {
      if(version.backend!==undefined)stop('Unknown Codex manager. Use the original launcher; no restart attempted.');
      if(world.platform!=='linux')stop('This server uses an external launcher. Use that original launcher, or quit and reopen its owning app. No restart attempted.');
      const candidates=await world.legacyServers();
      if(candidates.length!==1)stop('Expected exactly one supported background server. No restart attempted.');
      const target=candidates[0];plan=await world.prepare(target);
      await world.revalidate(target,plan);
      if(opts.check){output(`Background server PID ${target.pid}; launch context verified. No restart performed.`);return 0;}
      changed=true;await world.stop(target);
      const deadline=world.now()+world.stopTimeout;
      while(same(target,await world.inspect(target.pid))) {
        if(world.now()>=deadline)stop('Stop timed out; no replacement launched.');
        await world.sleep(100);
      }
      if(!await world.listenerFree())stop('Socket remains occupied; no replacement launched.');
      const replacement=await world.launch(plan),until=world.now()+world.readyTimeout;
      let verified=false;
      while(world.now()<until) {
        if(!same(replacement,await world.inspect(replacement.pid)))stop('Replacement exited or changed identity; readiness unverified.');
        try {
          if(ready(await world.version(replacement),world.home)&&await world.ownsListener(replacement.pid)) {
            if(!same(replacement,await world.inspect(replacement.pid)))stop('Replacement identity changed.');
            verified=true;break;
          }
        } catch(error) {if(error instanceof Refusal)throw error;}
        await world.sleep(200);
      }
      if(!verified)stop('Replacement started, but Codex readiness timed out.');
    }
    output('Codex restarted and responding. Reconnect your client and open a fresh chat.');return 0;
  } catch(error) {
    output(error instanceof Refusal?error.message:changed?'Restart failed; current state is unverified. No second launch attempted.':'Cannot verify the restart context. No restart attempted. Run with --check or use the original launcher.');
    return changed?4:2;
  } finally {
    let failed=false;try{await plan?.release();}catch{failed=true;}try{await unlock?.();}catch{failed=true;}
    if(failed){output('Restart helper cleanup failed; inspect the current state before retrying.');return 4;}
  }
}

// OS observations are injectable for isolated fixtures; the CLI always uses real OS data.
export async function systemWorld(selectedHome,environment=process.env,{proc='/proc',runCommand=exec,signal=process.kill.bind(process),spawnProcess=spawn}={}) {
  const home=await fs.realpath(selectedHome),uid=process.getuid?.();
  const read=async(file,limit=1048576)=>{
    const h=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
    try {
      const data=Buffer.alloc(limit+1);let n=0;
      while(n<=limit){const r=await h.read(data,n,data.length-n,null);if(!r.bytesRead)break;n+=r.bytesRead;}
      if(n>limit)stop('Process metadata exceeds the inspection limit.');
      return new TextDecoder('utf-8',{fatal:true}).decode(data.subarray(0,n));
    } finally {await h.close();}
  };
  const status=text=>Object.fromEntries(text.trim().split('\n').map(line=>{const i=line.indexOf(':');return [line.slice(0,i),line.slice(i+1).trim()];}));
  const command=(exe,args,context={})=>runCommand(exe,args,{env:{...environment,CODEX_HOME:home},timeout:5000,maxBuffer:1048576,...context});
  const version=async target=>JSON.parse((await command(target?.exe||'codex',['app-server','daemon','version'],target?{env:{...target.env,CODEX_HOME:home},cwd:target.cwd}:{})).stdout);
  const listeners=async()=>{
    const rows=(await read(proc+'/net/unix')).split('\n').slice(1).filter(Boolean);
    return rows.map(row=>row.trim().match(/^\S+\s+\S+\s+\S+\s+(\S+)\s+(\S+)\s+\S+\s+(\d+)(?:\s+(.*))?$/)).filter(m=>m&&(parseInt(m[1],16)&0x10000)&&m[2]==='0001'&&m[4]===socketFor(home)).map(m=>m[3]);
  };
  const ownsListener=async pid=>{
    const inodes=new Set(await listeners());
    for(const fd of await fs.readdir(`${proc}/${pid}/fd`)) {
      try {const m=(await fs.readlink(`${proc}/${pid}/fd/${fd}`)).match(/^socket:\[(\d+)\]$/);if(m&&inodes.has(m[1]))return true;}
      catch(error){if(error.code!=='ENOENT')throw error;}
    }
    return false;
  };
  const inspect=async pid=>{
    try {
      const root=`${proc}/${pid}`,s=status(await read(root+'/status',16384));
      if(!s.Uid||s.Uid.split(/\s+/).some(value=>Number(value)!==uid))return null;
      const argv=(await read(root+'/cmdline',65536)).split('\0');if(argv.at(-1)==='')argv.pop();
      if(path.basename(argv[0]||'')!=='codex'||JSON.stringify(argv.slice(1))!==JSON.stringify(['-c','features.code_mode_host=true','app-server','--listen','unix://']))return null;
      const text=await read(root+'/stat',16384),fields=text.slice(text.lastIndexOf(')')+2).trim().split(/\s+/);
      if(!/^\d+$/.test(fields[19]||'')||fields[0]==='Z')return null;
      const env={};for(const entry of (await read(root+'/environ')).split('\0').filter(Boolean)) {
        const i=entry.indexOf('=');if(i<1||Object.hasOwn(env,entry.slice(0,i)))stop('Unsupported process environment.');env[entry.slice(0,i)]=entry.slice(i+1);
      }
      const cwd=await fs.realpath(root+'/cwd');if(!env.HOME)return null;
      if(await fs.realpath(path.resolve(cwd,env.CODEX_HOME||path.join(env.HOME,'.codex')))!==home)return null;
      const exe=await fs.realpath(root+'/exe');if(path.basename(exe)!=='codex')return null;
      return {pid,start:fields[19],ppid:Number(fields[1]),exe,argv,env,cwd,home,status:Object.fromEntries(['Uid','Gid','Groups','NoNewPrivs','Seccomp','CapEff','Umask'].map(key=>[key,s[key]]))};
    } catch(error){if(['ENOENT','ESRCH'].includes(error.code))return null;throw error;}
  };
  const prepare=async target=>{
    const root=`${proc}/${target.pid}`,own=status(await read(proc+'/self/status',16384));
    if(target.ppid!==1||!(await read(root+'/cgroup',16384)).trim().split('\n').some(line=>/^0::\/user\.slice\/user-\d+\.slice\/session-[\w-]+\.scope$/.test(line)))stop('Use the original launcher for this supervised or foreground server.');
    for(const key of ['Uid','Gid','Groups','NoNewPrivs','Seccomp','CapEff'])if(target.status[key]!==own[key])stop('Server credentials or sandbox cannot be preserved.');
    if(await read(root+'/limits',16384)!==await read(proc+'/self/limits',16384))stop('Server resource limits cannot be preserved.');
    if(!/^[0-7]{3,4}$/.test(target.status.Umask||''))stop('Server umask cannot be preserved.');
    for(const fd of await fs.readdir(root+'/fd'))if(Number(fd)>2) {
      const flags=(await read(root+'/fdinfo/'+fd,16384)).match(/^flags:\s*([0-7]+)$/m);
      if(!flags||(parseInt(flags[1],8)&0o2000000)===0)stop('Server has an unsupported inherited file descriptor.');
    }
    if(await fs.readlink(root+'/fd/0')!=='/dev/null'||!await ownsListener(target.pid))stop('Server stdin or socket ownership is unsupported.');
    const logs=[];
    try {
      for(const fd of [1,2]) {
        const name=await fs.readlink(root+'/fd/'+fd),original=await fs.stat(root+'/fd/'+fd);
        const flags=(await read(root+'/fdinfo/'+fd,16384)).match(/^flags:\s*([0-7]+)$/m);
        if(!path.isAbsolute(name)||!original.isFile()||original.uid!==uid||!flags||(parseInt(flags[1],8)&constants.O_APPEND)===0)stop('Server output must use owned append log files.');
        const h=await fs.open(name,constants.O_WRONLY|constants.O_APPEND|constants.O_NOFOLLOW);logs.push(h);
        const opened=await h.stat();if(opened.dev!==original.dev||opened.ino!==original.ino)stop('Server log changed during inspection.');
      }
      return {target,logs,release:async()=>{await Promise.all(logs.map(h=>h.close()));}};
    } catch(error){await Promise.all(logs.map(h=>h.close()));throw error;}
  };
  return {
    home,platform:process.platform,version,inspect,prepare,ownsListener,sleep,now:Date.now,stopTimeout:10000,readyTimeout:30000,
    nativeRestart:()=>command('codex',['app-server','daemon','restart'],{timeout:30000}),
    legacyServers:async()=>{
      const names=(await fs.readdir(proc)).filter(name=>/^\d+$/.test(name));if(names.length>16384)stop('Too many processes to inspect safely.');
      const result=[];for(const name of names){const p=await inspect(Number(name));if(p)result.push(p);}return result;
    },
    revalidate:async (target,plan)=>{
      const current=await inspect(target.pid);
      if(!same(target,current)||JSON.stringify(current)!==JSON.stringify(target)||!await ownsListener(target.pid))stop('Server identity or launch context changed; no restart attempted.');
      const fresh=await prepare(current);
      try {if(plan)for(let i=0;i<2;i++){const a=await plan.logs[i].stat(),b=await fresh.logs[i].stat();if(a.dev!==b.dev||a.ino!==b.ino)stop('Server log changed; no restart attempted.');}}finally{await fresh.release();}
    },
    listenerFree:async()=>!(await listeners()).length,
    stop:async target=>signal(target.pid,'SIGTERM'),
    launch:async plan=>{
      const target=plan.target,mask=process.umask(parseInt(target.status.Umask,8));let child;
      try {child=spawnProcess(target.exe,target.argv.slice(1),{argv0:target.argv[0],cwd:target.cwd,env:target.env,detached:true,stdio:['ignore',...plan.logs.map(h=>h.fd)]});}
      finally {process.umask(mask);}
      await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
      const result=await inspect(child.pid);if(!result)stop('Replacement exited before its identity could be verified.');return result;
    },
    lock:async()=>{
      const dir=path.join(os.tmpdir(),`quickstark-codex-restart-${uid}-${createHash('sha256').update(home).digest('hex').slice(0,24)}`);
      try {await fs.mkdir(dir,{mode:0o700});}catch(error){if(error.code==='EEXIST')stop(`Another helper or retained lock exists: ${dir}. No restart attempted.`);throw error;}
      const original=await fs.lstat(dir);
      return async()=>{const current=await fs.lstat(dir);if(current.ino===original.ino&&current.dev===original.dev)await fs.rmdir(dir);};
    },
  };
}
const invoked=process.argv[1]&&process.argv[1]!=='-'&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked||process.argv[1]==='-')process.exitCode=await main();
QUICKSTARK_RESTART
```

</details>
<!-- quickstark-codex-restart:end -->

After updating QuickStark, start a fresh Codex chat to check that the skills load. Restart the App Server if the client still sees stale skills. A server restart can interrupt active or queued work across connected chats, so wait for that work to finish.

### Restart the client or the Codex-managed daemon

- **Terminal client** — Enter `/quit`, then run `codex` from the shell. Use `codex resume` to choose a saved chat or `codex resume --last` to continue the latest chat. These commands may reconnect to an existing App Server.
- **Desktop or editor-launched server** — Quit and reopen the desktop app, or reload the editor window that launched Codex. If the desktop app launched the server over SSH, disconnect and reconnect the host. For an independently managed remote server, restart it on the remote host, then reconnect.
- **Codex-managed App Server** — In the CLI, open `/daemon` and choose **Restart background server** if the menu offers it. From a shell on the server host, use the same OS account and `CODEX_HOME` as the running daemon.

```bash
codex app-server daemon restart
codex app-server daemon version
```

Check for a running App Server version, then reconnect and test a fresh chat. If your build lacks the shell command, check `codex app-server daemon --help` for its available controls. [OpenAI’s Codex command guide](https://learn.chatgpt.com/docs/developer-commands#manage-the-background-server-with-daemon)

### Find the account and launcher

If the daemon command reports `app server is running but is not managed by codex app-server daemon`, use the launcher that owns it. If a signal returns `Operation not permitted`, check the process account. Both checks matter because a system service can run as an ordinary user.

Run on the server host. Set `codex_pid` to the App Server PID you identify, then inspect its parent using the same `ps` command with the PPID.

```bash
id -un
ps -axww -o user,pid,ppid,command | grep -E '[c]odex.*app-server'
ps -ww -p "$codex_pid" -o user,pid,ppid,command
```

Keep the existing account, `CODEX_HOME`, and socket or port. Running the Codex CLI with plain `sudo` can select root’s configuration and start a different server.

### Linux with systemd

Use the PID to look up the unit. Run the user lookup from the service owner’s login. Check that the unit actually launches Codex before restarting it, since the system lookup can return a broader login scope or user manager.

```bash
systemctl --user status "$codex_pid"
systemctl status "$codex_pid"
```

Set `codex_unit` to the verified App Server service name and use the matching restart command.

```bash
# User service, from the owning account
systemctl --user restart "$codex_unit" && systemctl --user status "$codex_unit"

# System service, from an admin account
sudo systemctl restart "$codex_unit" && sudo systemctl status "$codex_unit"
```

For another account’s user service, SSH into the host as that account. If you already have admin access and systemd supports targeting a local user bus, set `codex_owner` to that account and check its service before restarting it.

```bash
sudo systemctl --user --machine="${codex_owner}@.host" status "$codex_unit"
sudo systemctl --user --machine="${codex_owner}@.host" restart "$codex_unit"
sudo systemctl --user --machine="${codex_owner}@.host" status "$codex_unit"
```

Use the live unit on the affected host because transient `run-*.service` names can change. [systemctl manual](https://manpages.debian.org/trixie/systemd/systemctl.1.en.html)

### macOS with a custom launchd job

If you installed a standalone launchd job, set `codex_label` to its verified label. Use its loaded domain. Run the GUI example from the owner’s logged-in Mac session. Use `user/UID` instead if that is where the job is loaded.

```bash
# GUI LaunchAgent
launchctl print "gui/$(id -u)/$codex_label" &&
  launchctl kickstart -k "gui/$(id -u)/$codex_label"

# System LaunchDaemon
sudo launchctl print "system/$codex_label" &&
  sudo launchctl kickstart -k "system/$codex_label"
```

Rerun the matching `launchctl print` to confirm the job is running. The desktop app’s bundled server is restarted by quitting and reopening the app.

### Manually launched App Server

For a foreground server, press Ctrl+C in its original terminal and rerun its launch command. For a detached server such as a `nohup` launch, use the owning account and confirm the PID immediately before sending `kill -TERM "$codex_pid"`. Wait for the process to exit and for its listener to be released, then rerun the original command with the same flags and environment. The old blanket `pkill … || true` can hide a permission error and attempt a second launch while the first server is still running.

The companion [Codex Commands](https://app.notion.com/p/3be238a125b280a29cc9d255a7ca2a7a) page has a shorter restart reference. For an existing legacy Unix-socket setup, the start half is below. Use it only if it matches that server’s original launch. Run it after the old process exits.

```bash
nohup codex -c features.code_mode_host=true app-server --listen unix:// \
  >>"$HOME/.codex-app-server.log" 2>&1 </dev/null &
```

Check the launcher status or startup log, then reconnect to the same host or socket and open a fresh chat to verify the updated skill appears. [OpenAI’s App Server guide](https://learn.chatgpt.com/docs/app-server)

## Installation overview

This guide describes the six-package target updater. Selection options require
the target registry; an older checkout using the legacy updater rejects
`--profile`, `--with` and `--resume`. Do not use documentation alone as
proof that a target package is accepted or installed.

Ordinary installation clean-reinstalls QuickStark separately in Codex, Claude Code
and Pi (the coding-agent harness). Use `--agent codex`, `--agent claude` (or `claude-code`), or `--agent pi`.
The updater detects those executables on PATH when no host is selected. Explicit
flags override detection; host selection is independent of the agent running it.
Repeat the flag to update multiple hosts; ordinary installation processes their
default or custom configuration homes independently.

## Selection and the repository template

Updates move from a verified repository checkout to one machine. They do not copy
installed caches back into Git, synchronize machines, or adopt upstream changes.
The six packages are core `qs-skills` (12 roots), `qs-specialists` (9),
`qs-advanced` (12), `qs-frontend` (4), `qs-video` (1) and `qs-execution` (1).

| Situation | Selection |
| --- | --- |
| Fresh machine, no selection flags | `qs-skills` only; no standalone resources |
| Saved machine, no selection flags | Saved packages and resources for each selected host |
| Previously managed machine without saved selection | Install core plus known QuickStark packages reported by the native manager |
| `--with <package-id>` | Explicit addition to the current selection; repeat for multiple additions |
| `--profile core` | Clean-reinstall core; remove other QuickStark package registrations |

`--agent` selects a host independently of package selection. `skills:update`
detects installed harnesses; direct plan/verify commands default to Codex.
The implemented addition flag is `--with`, not `--with-package`. Unknown IDs and
duplicate additions fail. New optional packages do not join an ordinary update.
The selection file is `~/.config/quickstark/skills-selection.json`. Requested
packages are saved before native removal, so a plain rerun keeps optional choices
after interruption. Installed bytes and registrations are verified before reporting success.
For a non-default host home, selection, updater locks, journals and backups use a
home-specific state directory instead, so profiles cannot inherit or replace
one another's saved selection or interrupted transaction.

## First setup

Use the same hosted command for first installation and later updates, from any
directory on macOS or Linux. Have Git, Node, curl and the harness CLIs you use on PATH:

```bash
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash
```

The bootstrap uses Node built-ins and local modules; `npm ci` is for development.
It selects the highest stable `vMAJOR.MINOR.PATCH` Git tag from the official
repository, resolves it to one commit and checks generated packages and committed
acceptance evidence locally before replacing the managed checkout. Numeric version
ordering handles versions such as 4.10.0 correctly; prereleases are ignored.
There are no client-side GitHub Actions queries or CI polling delays. Explicit
publication through `release.yml` creates the repository's version tag and GitHub
release directly. Linux/macOS tests are available in a separate manual workflow;
hosted runner availability does not gate publishing or local updates.

Use `--version MAJOR.MINOR.PATCH` to select an existing published version.
Automatic downgrades and changed source under the same version are rejected.
Published-version installation was introduced in 4.4.1. The current published
release is [4.4.6](https://github.com/quickstark/skills/releases/tag/v4.4.6), at
`fab40148cffd0c1ef3e0de6b4d44bc91bd411ca3`. Device installation remains unverified.
Earlier v4.4.0 lacks the new entry points and must not be retagged in place.

The installer retains versioned source checkouts under
`~/.local/share/quickstark/releases`; `~/.local/share/quickstark/current` is a
convenience link for local commands. Native packages and transaction journals use
physical versioned paths. A newer version does not rename or overwrite the source
needed by another profile or an interrupted transaction. Edited prior checkouts
are retained at their original paths while a clean replacement gets a new path.
Legacy `~/.local/share/quickstark/skills` directories and development clones remain
untouched. Installer ownership records remain under
`~/.local/state/quickstark/installer`; a recorded interrupted legacy source swap is
restored before proceeding. Active or unknown installer locks remain protected.

The updater detects executable `codex`, `claude` and `pi` commands on PATH, updates
their selections, and verifies installed state. Fresh hosts get core only. Existing
saved selections and already registered optional capabilities are retained. No
supported executable is an error; an incompatible manager fails visibly.

## Clean installation on every update

The ordinary path validates the published replacement, remembers the desired
packages, backs up QuickStark settings and caches, removes the known QuickStark
registrations, registers the selected release and installs those packages fresh.
It verifies the resulting registrations and package payloads. An edited or
same-version QuickStark cache is replaced rather than treated as a migration.
Original settings and caches remain in private `clean-<client>-*` directories
under the existing backup root. Old source checkouts are never edited or deleted.

Codex, Claude Code and Pi are attempted independently. If one fails, the other
selected clients still run and their individual results are reported. A plain
rerun performs the same clean installation using the remembered selection. It
does not require a transaction journal, repair receipt or `--resume` command.
If a clean installer is killed, the next run can reclaim its recorded lock only
when its owner on the same host is no longer running. Live, unknown and historical
locks remain protected. Selection writes are atomic under that installer lock.

Only the finite known QuickStark package IDs are removed. Other plugins and
settings are left to the native managers. Their caches are not traversed or
fingerprinted. Foreign marketplace bindings, unknown QuickStark entries, filtered
Pi entries and project-scoped Claude packages are preserved and reported before
removal. Pi settings may remain a symlink to a regular dotfile; Pi updates it
through that link, and relative package paths still use its configuration directory.
Settings must remain outside both the accepted release and retained source checkouts.

Existing migration journals, pending repair records, historical standalone skills
and backups are retained unchanged. They are not inputs to ordinary installation.
The direct plan/verify/migration engine and explicit `--resume` option remain
available for recovery of a selected historical transaction. Those advanced
commands retain their stricter historical ownership and snapshot checks.

From an updated clone, `npm run skills:update` invokes the same published-version
flow. Older clones may still contain the old npm command: use the hosted command
to bypass them. Extra flags can be passed with `| bash -s -- --agent codex`, for
example. `--json` selects structured updater results; installer progress uses stderr.

For the advanced local commands below, first use the managed checkout:

```bash
cd "$HOME/.local/share/quickstark/current"
```

For an optional read-only preview, use `npm run skills:plan -- --json --agent codex`
(or another explicit host). Direct plan/verify do not register marketplaces; on a
fresh host they require `codex plugin marketplace add ./codex` or
`claude plugin marketplace add .` first. Normal installation needs only update.

## Claude setup and legacy migration

Use the automatic updater, or select Claude explicitly. Claude packages use user
scope; existing project/local QuickStark registrations require explicit reconciliation. The core marketplace
entry points to the generated `packages/qs-skills` package, so the plugin cache
contains the public roots and private closure without copying the whole repository.

```bash
npm run skills:update -- --agent claude
```

A foreign marketplace source remains a conflict. The hosted installer clean-replaces known local QuickStark bindings as described
above. The remaining migration details in this section apply to direct engine
callers and retained historical transactions. Existing root-based Claude core packages migrate after their manifest,
declared core skills and private resources match an immutable Git ancestor. The
updater checks at most 32 manifest revisions in local history; unverifiable or
edited resources remain a conflict. The old cache is retained, including unrelated
files, and only native registration metadata and its orphan marker are changed.
The compact replacement requires a new release version; same-version caches are
never overwritten to force a layout change.

Claude recovery validates the original raw settings and metadata snapshots after
native inspection and immediately before restoring each target. A concurrent edit
blocks recovery and is preserved. Complete file replacements are prepared and
synced before an atomic rename. Before the first replacement, a bounded recovery
receipt records the raw target snapshots and immutable payload/source evidence;
its digest is synced into the journal's recovery intent. Replacements reuse the
snapshots that passed receipt validation and revalidate them before writing; a
later capture cannot adopt a concurrent edit as its baseline. An authorized recovery
retry validates each target against its original or restored bytes, so interruption
between settings and plugin metadata restoration can resume in a fresh process.
Edited targets, source changes or altered receipts block retry without replacing
those files. Recovery receipts also bind the installed payloads of active unrelated
plugins. Changes to those payloads block retry before any registration is restored,
including edits that introduce a duplicate skill identity. If an active unrelated
payload cannot be inspected, recovery preparation stops before restoration; preserve
that plugin and reconcile it explicitly. Unchanged unrelated plugins stay registered.
Retained caches restore only their orphan marker; interrupted removal of a newly
created cache resumes only over unchanged, previously recorded paths.
Failed recovery retains its journal, backups, receipt and residuals. Recovery does
not silently switch back to forward update.

## Target a separate Codex home

Use `--codex-home` when the Codex configuration profile is not the default
`~/.codex`. Resolution is explicit `--codex-home`, then inherited `CODEX_HOME`,
then `<resolved user home>/.codex`. `--home` still selects the operating-system
user home; `--profile` selects a QuickStark package profile; neither substitutes
for `--codex-home`. Ordinary installation can combine a custom Codex home with
other selected clients. The retained historical migration engine requires a
Codex-only transaction for that custom home.

Update the selected profile directly; pass the same home to standalone verification
or recovery:

```bash
npm run skills:update -- --agent codex --codex-home "$HOME/.codex-demo"
node scripts/managed-skills.mjs verify --json --agent codex --codex-home "$HOME/.codex-demo"
```

The selected profile's `config.toml`, plugin cache and discovery paths remain
under that Codex home. Native commands still receive the actual user home through
`HOME` and `USERPROFILE`, and receive the selected profile through `CODEX_HOME`.
Resume refuses a journal created for another normalized Codex home.

## Claude and Pi configuration profiles

| Host | Explicit path | Environment fallback | Default |
| --- | --- | --- | --- |
| Codex | `--codex-home` | `CODEX_HOME` | `<user home>/.codex` |
| Claude Code | `--claude-home` | `CLAUDE_CONFIG_DIR` | `<user home>/.claude` |
| Pi | `--pi-home` | `PI_CODING_AGENT_DIR` | `<user home>/.pi/agent` |

Explicit paths take precedence over environment variables. `--home` sets the user
home; it does not change package selection. Each custom configuration home has
separate selection, lock, journal and backup paths. Only the retained historical
migration engine requires a single-host transaction for a custom home. Pass the same host home to plan, update, verify and resume. Native commands
receive the resolved paths, preventing inherited overrides from redirecting a
transaction to another profile. Paths are resolved by Node without assuming a
particular checkout directory or shell. The GitHub validation matrix runs source
checks and isolated native integration tests with pinned Codex, Claude Code and Pi
CLIs on Linux and macOS 15. This is separate from deployment to a user's installed
profiles. Windows manager behavior is unverified. Ordinary installation attempts
each client independently, whether its home is default or custom. Explicit home
flags without `--agent` select only those hosts. A journal resumes its original
host group without rediscovering PATH; supply the original custom home again.

```bash
npm run skills:update -- --agent claude --claude-home "$HOME/.claude-demo"
npm run skills:update -- --agent pi --pi-home "$HOME/.pi-demo"
```

## Normal update and explicit additions

Use the hosted command again; it selects a published version and maintains the managed checkout:

```bash
curl -fsSL https://raw.githubusercontent.com/quickstark/skills/main/install.sh | bash
```

This preserves saved optional selections. To add frontend explicitly:

```bash
npm run skills:update -- --agent codex --with qs-frontend
```

Repeat `--with` for other selected packages. Omit `--profile core` during an ordinary
update unless you deliberately intend to replace the desired selection with core.
Restart the host or begin a new task after changing discovery.

Direct development callers of the lower-level transaction query `origin/main` without fetching
or changing refs and requires exact checkout HEAD equality. A stale clean main
checkout gets a fast-forward recovery command; a dirty, detached or non-main
checkout gets an isolated-worktree diagnostic. The hosted installer instead verifies its pinned published tag and clean checkout,
so later main commits do not invalidate a release. It preserves authoring checkouts. A denied freshness request is an attempted request, not proof of
zero network activity.

## Verification and recovery

From the managed checkout, `node scripts/managed-skills.mjs verify --json --agent
codex --agent pi` performs the read-only selected-state check. Ordinary updates
already verify their result; this command is optional.

For development, `npm run skills:verify -- --agent codex --agent pi` also runs the
repository checks and full test suite. Run it from a development checkout with an
attached branch and local `main`, rather than a detached published checkout.
Verification checks accepted package bindings and requires selected legacy
identities to have completed migration; a package version string alone is insufficient.

Codex and Claude package verification compares source and installed copies using
Git executable-bit semantics. Different directory permissions created by a native
manager do not require `chmod` or a new package version. File contents, paths and
executable bits must still match. Source transaction snapshots retain exact
permissions and reject source changes after planning. Recorded backup snapshots
also retain exact permissions; installed-cache identity uses the portable comparison.

`skills:sync -- --authorize` remains the explicit review-then-authorize interface.
Ordinary clean installation uses an exclusive updater lock and no transaction journal.
The direct legacy update/sync engine uses a transaction journal. Preserve a
failure's journal and backups. For an interrupted transaction, use its exact path:

```bash
npm run skills:update -- --resume /absolute/path/to/transaction.json
```

Older sources remain at their original physical paths, including after another
profile installs a newer version. Ordinary resume continues the frozen forward
plan using the journal's selection;
do not add profile or package flags. Failed transactions retain their journal,
backups and residuals. Restoring a prior release or journaled effects requires
separately verified, transaction-specific recovery authority; no automatic rollback
is promised.
A versioned resume reuses the managed checkout's original tag and commit, even
when a newer version exists. It must match the home, repository and release revision.
A legacy unversioned journal requires its original verified checkout and cannot be
silently resumed as a new published version. Historical transaction locks are
never automatically stolen. Ordinary clean installation can reclaim only a
recognized same-host lock whose owner is proven absent; live and unknown locks
remain protected.
Never repair a conflict by deleting a cache or rewriting a lock blindly. A failed
rollback must retain its residual paths and diagnostics rather than claim success.

The old `ps-skills` 3.8.0 payload remains a [transition artifact](./upstream/package-transition.md)
while existing native registrations need observation and verified withdrawal. Its
presence is not a new selection or an alias for a QS command. Unowned, edited,
filtered or ambiguous state remains a conflict; migration does not grant arbitrary
filesystem deletion or extra optional outcomes.

Contributor curation, exact pins, portable resource placement and separately
authorized third-party Pi manager actions are documented in the
[control-plane guide](./personal-skills.md). Project video runtime/model acquisition,
paid providers, publication, native settings changes outside the transaction and
optional execution hooks require their own task authority.
