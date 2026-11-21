#!/usr/bin/env node
/*
 * transcribe.cjs — word-level transcription via hyperframes' native Whisper
 * (replaces the Python ElevenLabs Scribe path; no Python, no API key).
 *
 *   node transcribe.cjs <project-dir> [model] [language]
 * Reads:  <project>/source.mp4 (audio track)
 * Writes: <project>/transcript.json  — { text, language_code, words:[{text,start,end,type}] }
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const cp = require("child_process");

function ensureSource(project) {
  const src = path.join(project, "source.mp4");
  if (fs.existsSync(src)) return src;
  const EXCL = new Set(["final", "bg_plus_caps", "fg_caps", "audio"]);
  let cands = fs
    .readdirSync(project)
    .filter(
      (f) =>
        ["mp4", "mov", "webm", "mkv", "m4v"].includes(path.extname(f).slice(1).toLowerCase()) &&
        !EXCL.has(path.basename(f, path.extname(f))) &&
        !f.startsWith("index"),
    )
    .map((f) => path.join(project, f));
  let found = cands.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
  if (found) {
    try {
      fs.symlinkSync(path.basename(found), src);
    } catch {
      fs.copyFileSync(found, src);
    }
  }
  return src;
}
function _usableWords(d) {
  return d && Array.isArray(d.words) && d.words.some((w) => w && "start" in w && "end" in w);
}
// Mean loudness of the audio, for the no-speech guard below. Silence → whisper
// hallucinates (famously "Thank you."), and the decision gate refuses "no speech".
function meanVolumeDb(audio) {
  try {
    // ffmpeg writes volumedetect stats to STDERR — capture it (spawnSync, no throw).
    const r = cp.spawnSync(
      "ffmpeg",
      ["-hide_banner", "-nostats", "-i", audio, "-af", "volumedetect", "-f", "null", "-"],
      { encoding: "utf8" },
    );
    const out = (r.stderr || "") + (r.stdout || "");
    const m = out.match(/mean_volume:\s*(-?[\d.]+) dB/);
    return m ? parseFloat(m[1]) : null;
  } catch {
    return null;
  }
}

// Where does AUDIBLE content end? Whisper hallucinates trailing words over a silent
// tail (observed: "I'm sorry." repeated over dead air at a clip's end). silencedetect
// finds a terminal silence running to EOF; words "spoken" inside it are fabricated.
// Conservative: applause/music read as non-silence, so this fires only on truly dead
// tails. Returns {speechEnd, total} or null.
function audibleEnd(audio) {
  try {
    const r = cp.spawnSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-nostats",
        "-i",
        audio,
        "-af",
        "silencedetect=noise=-35dB:d=0.6",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8" },
    );
    const out = (r.stderr || "") + (r.stdout || "");
    const durM = out.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    const total = durM ? +durM[1] * 3600 + +durM[2] * 60 + +durM[3] : null;
    if (total == null) return null;
    const starts = [...out.matchAll(/silence_start:\s*([\d.]+)/g)].map((x) => +x[1]);
    const ends = [...out.matchAll(/silence_end:\s*([\d.]+)/g)].map((x) => +x[1]);
    if (!starts.length) return { speechEnd: total, total };
    const lastStart = starts[starts.length - 1];
    const closed = ends.some((e) => e > lastStart); // silence re-broken before EOF?
    return { speechEnd: closed ? total : lastStart, total };
  } catch {
    return null;
  }
}

async function main() {
  const project = path.resolve(process.argv[2] || "");
  if (!process.argv[2]) {
    console.error("usage: transcribe.cjs <project-dir> [model] [language]");
    process.exit(1);
  }
  // Default = multilingual `small`, NOT `small.en`. Per media-use: ".en models
  // mistranslate non-English and mis-handle accented speech; default to small (auto-detects
  // language)." We hardcoded small.en before — it hallucinated a wrong transcript on an
  // accented speaker. Pass `small.en` only for known-clean-English; tough accents → a larger model.
  const model = process.argv[3] || process.env.WHISPER_MODEL || "small";
  const language = process.argv[4] || process.env.WHISPER_LANG || "";
  const out = path.join(project, "transcript.json");

  // already in our schema? skip — but validate the SHAPE, not just the keys:
  // `hyperframes init` drops a whisper.cpp segment/token-format transcript.json
  // (offsets-in-ms, nested tokens) that can carry a `words` key yet poison the
  // compilers. Only a word-level {text,start,end} array counts as normalized.
  try {
    const d = JSON.parse(fs.readFileSync(out, "utf8"));
    const wordShaped =
      d &&
      Array.isArray(d.words) &&
      d.words.length > 0 &&
      d.words.every(
        (w) =>
          w &&
          typeof (w.text ?? w.word) === "string" &&
          Number.isFinite(w.start) &&
          Number.isFinite(w.end) &&
          w.end < 36000, // ms-offset formats blow past any sane seconds value
      );
    if (wordShaped && d.language_code) {
      console.log("[transcribe] already normalized, skipping");
      return;
    }
    if (d && !wordShaped) {
      console.log(
        "[transcribe] existing transcript.json is NOT word-level (init stub / segment format) — regenerating",
      );
    }
  } catch {}

  const {selectedCli,requireLocalProvider,runtimeEnvironment}=await import('../../../scripts/runtime.mjs');
  const cli=selectedCli();
  const runtimeEnv=runtimeEnvironment();
  const version=cp.execFileSync(cli,['--version'],{encoding:'utf8',timeout:15000,env:runtimeEnv}).trim();
  if(version!=='0.8.77') throw new Error('Caption transcription requires tested CLI0.8.77; the project pin is not changed.');
  const packagePath=path.join(project,'package.json');
  if(fs.existsSync(packagePath)) {
    const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
    const pin=pkg.devDependencies?.hyperframes ?? pkg.dependencies?.hyperframes;
    if(pin && pin!=='0.8.77') throw new Error(`Project runtime pin ${pin} is not validated for this transcription adapter; preserve it and resolve compatibility separately.`);
  }
  const requestedEngine=process.env.TRANSCRIBE_ENGINE || 'auto';
  if(!['auto','whisper','whisperx'].includes(requestedEngine)) throw new Error('TRANSCRIBE_ENGINE must be auto, whisper or whisperx.');
  const ready=(process.env.QS_VIDEO_VERIFIED_LOCAL_PROVIDERS || '').split(',');
  const wantWx=requestedEngine==='whisperx' || (requestedEngine==='auto' && ready.includes('whisperx'));
  function regularPrerequisite(file,label) {
    if(!file || !path.isAbsolute(file) || !fs.existsSync(file) || !fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink() || fs.statSync(file).size===0) throw new Error(`${label} requires an existing absolute regular file; no tool/model is downloaded.`);
  }
  function whisperPrerequisites() {
    requireLocalProvider('whisper');
    regularPrerequisite(process.env.HYPERFRAMES_WHISPER_PATH,'HYPERFRAMES_WHISPER_PATH');
    fs.accessSync(process.env.HYPERFRAMES_WHISPER_PATH,fs.constants.X_OK);
    if(!/^[a-z0-9][a-z0-9.-]*$/.test(model)) throw new Error('Invalid Whisper model ID');
    // Explicit non-English language can select the multilingual counterpart.
    const effectiveModel=language && language!=='en' ? model.replace(/\.en$/,'') : model;
    regularPrerequisite(path.join(os.homedir(),'.cache','hyperframes','whisper','models',`ggml-${effectiveModel}.bin`),'Whisper cached model');
  }
  let whisperxCli;
  if(wantWx) {
    requireLocalProvider('whisperx');
    whisperxCli=process.env.QS_VIDEO_WHISPERX;
    regularPrerequisite(whisperxCli,'QS_VIDEO_WHISPERX');fs.accessSync(whisperxCli,fs.constants.X_OK);
  } else whisperPrerequisites();

  const src = ensureSource(project);
  if (!fs.existsSync(src)) {
    console.error(`[transcribe] no source in ${project}`);
    process.exit(2);
  }
  const audio = path.join(project, "audio.mp3");
  if (!fs.existsSync(audio))
    cp.execFileSync(
      "ffmpeg",
      ["-y", "-i", src, "-vn", "-acodec", "libmp3lame", "-q:a", "2", audio],
      { stdio: "ignore" },
    );

  // ── engine: WhisperX (preferred — wav2vec2 forced alignment gives word timings far
  // tighter than whisper.cpp's segment-interpolated ones; our gates are 80ms-strict) →
  // fallback hyperframes whisper.cpp. Force with TRANSCRIBE_ENGINE=whisper|whisperx.
  let words = null,
    engine = null;
  // QS: an available verified local WhisperX remains preferred in auto mode.
  if (wantWx) {
    try {
      const wav = path.join(project, "_wx_audio.wav");
      cp.execFileSync("ffmpeg", ["-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", wav], {
        stdio: "ignore",
      });
      const outDir = path.join(project, "_wx_out");
      fs.mkdirSync(outDir, { recursive: true });
      const wxModel = model.replace(/\.en$/, ""); // whisperx model names are multilingual ids
      // Execute only the verified existing WhisperX binary; never use uvx.
      const wxArgs = [
        wav,
        "--model",
        wxModel,
        "--device",
        "cpu",
        "--compute_type",
        "int8",
        "--output_dir",
        outDir,
        "--output_format",
        "json",
        "--no_align_deletes",
        "--print_progress",
        "False",
      ];
      if (language) wxArgs.push("--language", language);
      // strip our flag if this whisperx build doesn't know it
      let r = cp.spawnSync(whisperxCli, wxArgs, { encoding: "utf8", timeout: 600000, env: runtimeEnv });
      if ((r.status || 0) !== 0 && /no_align_deletes/.test(r.stderr || "")) {
        r = cp.spawnSync(
          whisperxCli,
          wxArgs.filter((a) => a !== "--no_align_deletes"),
          { encoding: "utf8", timeout: 600000, env: runtimeEnv },
        );
      }
      if ((r.status || 0) !== 0)
        throw new Error(
          (r.stderr || "whisperx failed").split("\n").slice(-4).join(" ").slice(0, 300),
        );
      const wxJson = JSON.parse(fs.readFileSync(path.join(outDir, "_wx_audio.json"), "utf8"));
      const wx = [];
      for (const seg of wxJson.segments || [])
        for (const w of seg.words || []) {
          // alignment occasionally yields a word with no timing (OOV) — interpolate from neighbors later; mark null now
          wx.push({ text: String(w.word || "").trim(), start: w.start, end: w.end, type: "word" });
        }
      // interpolate missing timings from neighbors (rare OOV/number cases)
      for (let i = 0; i < wx.length; i++) {
        if (wx[i].start == null || wx[i].end == null) {
          const prevEnd = i > 0 ? wx[i - 1].end : 0;
          const nextStart = wx.slice(i + 1).find((x) => x.start != null);
          const ns = nextStart ? nextStart.start : prevEnd + 0.3;
          wx[i].start = prevEnd;
          wx[i].end = Math.max(prevEnd + 0.05, ns - 0.02);
        }
      }
      if (wx.length) {
        words = wx.filter((w) => w.text);
        engine = `whisperx(${wxModel}+wav2vec2)`;
      }
      try {
        fs.unlinkSync(wav);
      } catch {}
    } catch (e) {
      if(requestedEngine==='whisperx') throw new Error(`Selected WhisperX failed: ${e.message}`);
      console.error(
        `[transcribe] whisperx unavailable (${String(e.message || e).slice(0, 160)}) — falling back to whisper.cpp`,
      );
    }
  }

  if(!words && requestedEngine==='whisperx') throw new Error('Selected WhisperX produced no valid words');
  if (!words) {
    // run hyperframes Whisper → writes a flat word array to <dir>/transcript.json
    whisperPrerequisites();
    const args = ["transcribe", audio, "-d", project, "--json", "--engine", "whisper", "--model", model];
    if (language) args.push("--language", language);
    let info = {};
    try {
      const so = cp.execFileSync(cli, args, { encoding: "utf8", timeout: 600000, env: runtimeEnv });
      const line = so.trim().split("\n").filter(Boolean).pop();
      info = JSON.parse(line);
    } catch (e) {
      console.error("[transcribe] hyperframes whisper failed:", e.message);
      process.exit(1);
    }
    const flatPath = path.resolve(info.transcriptPath || out);
    if(flatPath!==path.resolve(out)) throw new Error('CLI returned an unexpected transcript path');
    const flat = JSON.parse(fs.readFileSync(flatPath, "utf8"));
    const arr = Array.isArray(flat) ? flat : flat.words || [];
    words = arr
      .filter((w) => (w.text ?? w.word) != null)
      .map((w) => ({
        text: w.text ?? w.word,
        start: w.start ?? w.t0,
        end: w.end ?? w.t1,
        type: "word",
      }));
    if(!words.length || words.some(w=>typeof w.text!=='string' || !Number.isFinite(w.start) || !Number.isFinite(w.end) || w.start<0 || w.end<w.start)) throw new Error('CLI output did not contain valid word timestamps');
    engine = `whisper.cpp(${model})`;
  }

  // Tail-hallucination guard: drop words whisper placed entirely inside a terminal
  // silence (it fabricates e.g. repeated "I'm sorry." over dead air). Word START past
  // the audible end (+0.4s slack) = fabricated; real final words start before it.
  const ae = audibleEnd(audio);
  let trimmedTail = 0;
  if (ae && ae.speechEnd < ae.total - 0.8) {
    const keep = words.filter((w) => w.start <= ae.speechEnd + 0.4);
    trimmedTail = words.length - keep.length;
    if (trimmedTail > 0) {
      console.error(
        `[transcribe] ⚠ trimmed ${trimmedTail} trailing word(s) starting after the audible end ` +
          `(${ae.speechEnd.toFixed(2)}s; clip ${ae.total.toFixed(2)}s) — whisper hallucinates over silent tails.`,
      );
      words = keep;
    }
  }

  const text = words
    .map((w) => w.text)
    .join(" ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        text,
        language_code: language || "en",
        engine,
        words,
        ...(trimmedTail ? { trimmed_tail_words: trimmedTail } : {}),
      },
      null,
      2,
    ),
  );
  console.log(`[transcribe] ${engine} ${words.length} words → ${out}`);
  console.log(`[transcribe] text: ${text.slice(0, 160)}${text.length > 160 ? "…" : ""}`);

  // No-speech guard: whisper returns confident hallucinations over silence (e.g. the
  // whole clip as "Thank you."). The decision gate REFUSES "no speech" — operationalize
  // it so an agent trusting the transcript can't sail past the gate.
  const meanDb = meanVolumeDb(audio);
  if (meanDb != null && meanDb < -45) {
    console.error(
      `\n[transcribe] ⚠ NEAR-SILENT AUDIO — mean ${meanDb.toFixed(1)} dB (real speech ≈ -16..-26 dB).`,
    );
    console.error(
      `  This transcript is almost certainly a Whisper hallucination, NOT real speech.`,
    );
    console.error(
      `  Per the decision gate, REFUSE "no speech" — confirm with \`ffmpeg -i <src> -af silencedetect\`;`,
    );
    console.error(`  do NOT author captions from fabricated words.`);
  }
}
main().catch(error=>{console.error(`[transcribe] ${error.message}`);process.exitCode=1;});
