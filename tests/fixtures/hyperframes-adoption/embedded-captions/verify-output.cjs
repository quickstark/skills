// Independent decoded-pixel and audio oracles for the real interview fixture.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {createRequire}=require('node:module');
const sharp=createRequire(process.env.QS_VIDEO_CLI)('sharp');
const project=path.resolve(process.argv[2]),W=640,H=360;
function pixels(file,frame){return cp.execFileSync('ffmpeg',['-v','error','-i',file,'-vf',`select=eq(n\\,${frame})`,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:8*1024*1024});}
function delta(a,b){
 let captionChanges=0,outsideError=0,outsideN=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=(y*W+x)*3,d=(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/3;
  if(x>=445&&x<638&&y<165){if(d>35)captionChanges++;}
  else {outsideError+=d;outsideN++;}
 }
 return {captionChanges,outsideMeanAbsoluteError:outsideError/outsideN};
}
function assert(v,message){if(!v)throw new Error(message);}
function audio(file){return cp.execFileSync('ffmpeg',['-v','error','-i',file,'-vn','-ac','1','-ar','16000','-f','s16le','pipe:1']);}
(async()=>{
 const samples=[1,11,21].map(frame=>({frame,...delta(pixels(path.join(project,'source.mp4'),frame),pixels(path.join(project,'final.mp4'),frame))}));
 assert(samples[1].captionChanges>700,'active caption missing in decoded output');
 assert(samples[0].captionChanges<150&&samples[2].captionChanges<150,'caption outside supplied active window');
 assert(samples.every(s=>s.outsideMeanAbsoluteError<8),'source footage changed outside caption region');
 // The same text-presence oracle must reject source-only output.
 const source=pixels(path.join(project,'source.mp4'),11);
 assert(!(delta(source,source).captionChanges>700),'missing-caption negative control accepted');
 const {data,info}=await sharp(path.join(project,'frames_fg/f_0012.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const alpha=(x,y)=>data[(y*info.width+x)*4+3];
 assert(alpha(240,130)>230&&alpha(600,300)<20,'matte did not separate actual person from background');
 let opaque=0,transparent=0;for(let i=3;i<data.length;i+=4){if(data[i]>230)opaque++;if(data[i]<20)transparent++;}
 assert(opaque>W*H*.15&&transparent>W*H*.35,'matte alpha lacks meaningful foreground/background');
 const aa=audio(path.join(project,'source.mp4')),bb=audio(path.join(project,'final.mp4'));let dot=0,sa=0,sb=0;
 const n=Math.min(aa.length,bb.length);for(let i=0;i<n-1;i+=2){const x=aa.readInt16LE(i),y=bb.readInt16LE(i);dot+=x*y;sa+=x*x;sb+=y*y;}
 const correlation=dot/Math.sqrt(sa*sb);assert(correlation>.98,'source audio not preserved');
 const result={samples,alpha:{subject:alpha(240,130),background:alpha(600,300),opaque,transparent},audioCorrelation:correlation,missingCaptionNegative:'rejected'};
 fs.writeFileSync(path.join(project,'output-oracles.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
