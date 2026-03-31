"use client";

import { useState, useRef, useEffect } from "react";

const BACKEND_URL = "http://localhost:1234";
type SourceType = "both" | "news" | "reddit"
export default function AIJournalist() {
  const [topics, setTopics] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("both");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addTopic = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || topics.length >= 1) return;
    setTopics([...topics, trimmed]);
    setInputValue("");
    setAudioUrl(null);
    setAudioBlob(null);
    setError(null);
  };

  const removeTopic = (i: number) => {
    setTopics(topics.filter((_, idx) => idx !== i));
    setAudioUrl(null);
    setAudioBlob(null);
  };

  const startProgress = () => {
    setProgress(0);
    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 3;
      if (p > 90) p = 90;
      setProgress(Math.round(p));
    }, 400);
  };

  const stopProgress = (success: boolean) => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(success ? 100 : 0);
  };

  const handleGenerate = async () => {
    if (!topics.length) return;
    setLoading(true);
    setError(null);
    setAudioUrl(null);
    setAudioBlob(null);
    startProgress();

    try {
      const res = await fetch(`${BACKEND_URL}/generate_news_audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics, source_type: sourceType }),
      });

      if (!res.ok) {
        let detail = "Unknown error";
        try { const j = await res.json(); detail = j.detail || detail; } catch {}
        throw new Error(`API Error (${res.status}): ${detail}`);
      }

      const blob = await res.blob();
      stopProgress(true);
      setAudioUrl(URL.createObjectURL(blob));
      setAudioBlob(blob);
    } catch (e: any) {
      stopProgress(false);
      setError(e.message || "Connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!audioBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(audioBlob);
    a.download = "news-summary.mp3";
    a.click();
  };

  const sources = [
    { id: "both" as SourceType, label: "All Sources", icon: "⚡", desc: "News + Reddit" },
    { id: "news" as SourceType, label: "News Only", icon: "◈", desc: "Official outlets" },
    { id: "reddit" as SourceType, label: "Reddit Only", icon: "◉", desc: "Community voice" },
  ];

  return (
    <div className={`app ${mounted ? "mounted" : ""}`}>
      <div className="ambient">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-icon">◈</span>
            <span className="brand-name">affairs.co</span>
            <span className="brand-tag">AI Journalist</span>
          </div>
          <div className="topbar-right">
            <span className="status-dot" />
            <span className="status-text">Live</span>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <p className="hero-eyebrow">Powered by AI · Real-time analysis</p>
          <h1 className="hero-title">
            Your personal<br />
            <span className="hero-highlight">news broadcast</span>
          </h1>
          <p className="hero-sub">
            Enter a topic. Get a professionally narrated audio summary
            from news outlets and Reddit — delivered in seconds.
          </p>
        </section>

        <div className="card-grid">
          <div className="card card-config">
            <div className="card-header">
              <span className="card-num">01</span>
              <span className="card-title">Configure</span>
            </div>

            <div className="field-group">
              <label className="field-label">Topic</label>
              <div className="input-row">
                <input
                  className="field-input"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTopic()}
                  placeholder="e.g. Artificial Intelligence"
                  disabled={topics.length >= 1}
                />
                <button
                  className="btn-add"
                  onClick={addTopic}
                  disabled={topics.length >= 1 || !inputValue.trim()}
                >
                  +
                </button>
              </div>

              {topics.length > 0 && (
                <div className="topic-pills">
                  {topics.map((t, i) => (
                    <div key={i} className="topic-pill">
                      <span className="pill-dot" />
                      <span className="pill-text">{t}</span>
                      <button className="pill-remove" onClick={() => removeTopic(i)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="field-group">
              <label className="field-label">Data Source</label>
              <div className="source-grid">
                {sources.map(s => (
                  <button
                    key={s.id}
                    className={`source-card ${sourceType === s.id ? "active" : ""}`}
                    onClick={() => setSourceType(s.id)}
                  >
                    <span className="sc-icon">{s.icon}</span>
                    <span className="sc-label">{s.label}</span>
                    <span className="sc-desc">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card card-output">
            <div className="card-header">
              <span className="card-num">02</span>
              <span className="card-title">Generate</span>
            </div>

            <button
              className={`btn-generate ${loading ? "is-loading" : ""} ${audioUrl ? "is-done" : ""}`}
              onClick={handleGenerate}
              disabled={loading || topics.length === 0}
            >
              {loading ? (
                <span className="gen-inner">
                  <span className="gen-rings">
                    <span className="ring r1" />
                    <span className="ring r2" />
                    <span className="ring r3" />
                  </span>
                  <span className="gen-label">Generating broadcast…</span>
                </span>
              ) : audioUrl ? (
                <span className="gen-inner">
                  <span className="gen-check">✓</span>
                  <span className="gen-label">Regenerate</span>
                </span>
              ) : (
                <span className="gen-inner">
                  <span className="gen-play">▶</span>
                  <span className="gen-label">Generate Broadcast</span>
                </span>
              )}
            </button>

            {loading && (
              <>
                <div className="progress-wrap">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="progress-pct">{progress}%</span>
                </div>
                <div className="steps">
                  {["Scraping sources", "Analyzing content", "Writing script", "Generating audio"].map((step, i) => (
                    <div key={i} className={`step ${progress > (i + 1) * 25 ? "done" : progress > i * 25 ? "active" : ""}`}>
                      <span className="step-dot" />
                      <span className="step-label">{step}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {error && (
              <div className="error-card">
                <span className="error-icon">⚠</span>
                <span className="error-msg">{error}</span>
              </div>
            )}

            {audioUrl && !loading && (
              <div className="audio-card">
                <div className="audio-top">
                  <div className="audio-info">
                    <span className="audio-live">
                      <span className="pulse-dot" />
                      Ready
                    </span>
                    <span className="audio-topic">{topics[0]}</span>
                  </div>
                  <div className="waveform">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.07}s` }} />
                    ))}
                  </div>
                </div>
                <audio src={audioUrl} controls className="audio-player" />
                <button className="btn-download" onClick={handleDownload}>
                  <span className="dl-icon">↓</span>
                  Download MP3
                </button>
              </div>
            )}

            {!audioUrl && !loading && !error && (
              <div className="empty-state">
                <div className="empty-icon">◈</div>
                <p className="empty-text">Your broadcast will appear here</p>
                <p className="empty-sub">Add a topic and hit generate</p>
              </div>
            )}
          </div>
        </div>

        <footer className="footer">
          <span>Personal AI Journalist · Built with FastAPI + Next.js</span>
        </footer>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Sans:ital,wght@0,400;0,500;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #060608;
          --surface: rgba(255,255,255,0.04);
          --surface2: rgba(255,255,255,0.07);
          --border: rgba(255,255,255,0.08);
          --border2: rgba(255,255,255,0.14);
          --accent: #7c6dfa;
          --accent2: #e05fff;
          --accent3: #00e5cc;
          --text: #f4f4f6;
          --text2: #9090a0;
          --text3: #5a5a6a;
          --red: #ff4466;
          --green: #00e5a0;
          --r: 12px;
        }

        body { background: #060608; }

        .app {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Instrument Sans', sans-serif;
          position: relative;
          overflow-x: hidden;
          opacity: 0;
          transition: opacity 0.6s ease;
        }
        .app.mounted { opacity: 1; }

        .ambient {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(130px);
          opacity: 0.15;
        }
        .orb1 {
          width: 700px; height: 700px;
          background: var(--accent);
          top: -300px; left: -200px;
          animation: drift1 20s ease-in-out infinite;
        }
        .orb2 {
          width: 600px; height: 600px;
          background: var(--accent2);
          bottom: -200px; right: -150px;
          animation: drift2 25s ease-in-out infinite;
        }
        .orb3 {
          width: 400px; height: 400px;
          background: var(--accent3);
          top: 40%; left: 50%;
          transform: translate(-50%,-50%);
          opacity: 0.07;
          animation: drift3 30s ease-in-out infinite;
        }
        @keyframes drift1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(80px,60px)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-60px,-80px)} }
        @keyframes drift3 { 0%,100%{transform:translate(-50%,-50%)} 50%{transform:translate(-44%,-56%)} }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(6,6,8,0.75);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--border);
        }
        .topbar-inner {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 32px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-icon { font-size: 20px; color: var(--accent); }
        .brand-name {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 15px;
          letter-spacing: 0.12em;
        }
        .brand-tag {
          font-size: 11px;
          color: var(--text3);
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border: 1px solid var(--border);
          border-radius: 20px;
        }
        .topbar-right { display: flex; align-items: center; gap: 6px; }
        .status-dot {
          width: 6px; height: 6px;
          background: var(--green);
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        .status-text { font-size: 11px; color: var(--green); letter-spacing: 0.1em; }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .main {
          max-width: 1080px;
          margin: 0 auto;
          padding: 72px 32px 56px;
          position: relative;
          z-index: 1;
        }

        .hero {
          text-align: center;
          margin-bottom: 72px;
          animation: fadeUp 0.8s ease both;
        }
        .hero-eyebrow {
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 20px;
        }
        .hero-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(44px, 6vw, 76px);
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin-bottom: 20px;
        }
        .hero-highlight {
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-sub {
          font-size: 15px;
          color: var(--text2);
          line-height: 1.7;
          max-width: 480px;
          margin: 0 auto;
        }

        .card-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          animation: fadeUp 0.8s 0.15s ease both;
        }
        @media (max-width: 768px) {
          .card-grid { grid-template-columns: 1fr; }
          .main { padding: 40px 20px 40px; }
          .topbar-inner { padding: 0 20px; }
        }

        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 28px;
          backdrop-filter: blur(16px);
          transition: border-color 0.2s;
        }
        .card:hover { border-color: var(--border2); }

        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border);
        }
        .card-num {
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          color: var(--accent);
          letter-spacing: 0.15em;
          font-weight: 700;
        }
        .card-title {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text2);
        }

        .field-group { margin-bottom: 28px; }
        .field-group:last-child { margin-bottom: 0; }
        .field-label {
          display: block;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text3);
          margin-bottom: 10px;
          font-weight: 500;
        }
        .input-row { display: flex; gap: 8px; }
        .field-input {
          flex: 1;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-family: 'Instrument Sans', sans-serif;
          font-size: 14px;
          padding: 12px 16px;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .field-input::placeholder { color: var(--text3); }
        .field-input:focus {
          border-color: var(--accent);
          background: rgba(124,109,250,0.06);
        }
        .field-input:disabled { opacity: 0.35; cursor: not-allowed; }

        .btn-add {
          width: 44px; height: 44px;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 22px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .btn-add:hover:not(:disabled) { background: var(--accent2); transform: scale(1.05); }
        .btn-add:disabled { opacity: 0.3; cursor: not-allowed; }

        .topic-pills { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
        .topic-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(124,109,250,0.08);
          border: 1px solid rgba(124,109,250,0.2);
          border-radius: 8px;
          animation: fadeUp 0.3s ease;
        }
        .pill-dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; flex-shrink: 0; }
        .pill-text { flex: 1; font-size: 13px; color: var(--text); }
        .pill-remove {
          background: none; border: none;
          color: var(--text3); font-size: 18px;
          cursor: pointer; line-height: 1; padding: 0 2px;
          transition: color 0.15s;
        }
        .pill-remove:hover { color: var(--red); }

        .source-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .source-card {
          display: flex; flex-direction: column;
          align-items: center; gap: 4px;
          padding: 14px 8px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
        }
        .source-card:hover { border-color: var(--border2); }
        .source-card.active {
          background: rgba(124,109,250,0.1);
          border-color: var(--accent);
        }
        .sc-icon { font-size: 18px; margin-bottom: 2px; }
        .sc-label {
          font-family: 'Syne', sans-serif;
          font-size: 11px; font-weight: 700;
          color: var(--text); letter-spacing: 0.03em;
        }
        .sc-desc { font-size: 10px; color: var(--text3); }
        .source-card.active .sc-label { color: var(--accent); }

        .btn-generate {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 15px; font-weight: 700;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 20px;
          position: relative; overflow: hidden;
        }
        .btn-generate::after {
          content: ''; position: absolute; inset: 0;
          background: rgba(255,255,255,0.1);
          opacity: 0; transition: opacity 0.2s;
        }
        .btn-generate:hover:not(:disabled)::after { opacity: 1; }
        .btn-generate:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(124,109,250,0.35); }
        .btn-generate:active:not(:disabled) { transform: translateY(0); }
        .btn-generate:disabled { opacity: 0.35; cursor: not-allowed; }
        .btn-generate.is-done { background: linear-gradient(135deg, #2a2a3a, #3a2a4a); }

        .gen-inner { display: flex; align-items: center; justify-content: center; gap: 10px; }
        .gen-play { font-size: 14px; }
        .gen-check { font-size: 16px; color: var(--green); }
        .gen-label { font-size: 14px; }

        .gen-rings { position: relative; width: 20px; height: 20px; flex-shrink: 0; }
        .ring {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          animation: spin 1.2s linear infinite;
        }
        .r1 { border-top-color: #fff; }
        .r2 { inset: 4px; border-top-color: rgba(255,255,255,0.6); animation-duration: 0.9s; animation-direction: reverse; }
        .r3 { inset: 8px; border-top-color: rgba(255,255,255,0.3); animation-duration: 0.6s; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .progress-wrap {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 20px;
        }
        .progress-track {
          flex: 1; height: 3px;
          background: var(--border);
          border-radius: 2px; overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          border-radius: 2px;
          transition: width 0.4s ease;
        }
        .progress-pct {
          font-size: 11px; color: var(--text3);
          letter-spacing: 0.05em;
          min-width: 32px; text-align: right;
        }

        .steps { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .step {
          display: flex; align-items: center; gap: 10px;
          font-size: 12px; color: var(--text3);
          transition: color 0.3s;
        }
        .step.active { color: var(--text2); }
        .step.done { color: var(--green); }
        .step-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--text3);
          flex-shrink: 0; transition: background 0.3s;
        }
        .step.active .step-dot { background: var(--accent); animation: pulse-dot 1s infinite; }
        .step.done .step-dot { background: var(--green); }

        .error-card {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 14px 16px;
          background: rgba(255,68,102,0.08);
          border: 1px solid rgba(255,68,102,0.2);
          border-radius: 8px; margin-bottom: 20px;
          animation: fadeUp 0.3s ease;
        }
        .error-icon { color: var(--red); font-size: 14px; flex-shrink: 0; margin-top: 1px; }
        .error-msg { font-size: 12px; color: var(--red); line-height: 1.5; }

        .audio-card {
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: 10px; padding: 18px;
          animation: fadeUp 0.4s ease;
        }
        .audio-top {
          display: flex; align-items: center;
          justify-content: space-between; margin-bottom: 14px;
        }
        .audio-info { display: flex; flex-direction: column; gap: 4px; }
        .audio-live {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; letter-spacing: 0.15em;
          text-transform: uppercase; color: var(--green);
        }
        .pulse-dot {
          width: 6px; height: 6px;
          background: var(--green); border-radius: 50%;
          animation: pulse-dot 1.5s infinite;
        }
        .audio-topic {
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 700; color: var(--text);
        }

        .waveform {
          display: flex; align-items: center;
          gap: 2px; height: 28px;
        }
        .wave-bar {
          display: block; width: 3px;
          background: var(--accent); border-radius: 2px;
          animation: wave 1s ease-in-out infinite alternate;
          opacity: 0.7;
        }
        .wave-bar:nth-child(odd) { height: 8px; }
        .wave-bar:nth-child(even) { height: 16px; }
        .wave-bar:nth-child(3n) { height: 24px; }
        @keyframes wave { from{transform:scaleY(0.4)} to{transform:scaleY(1.2)} }

        .audio-player {
          width: 100%; height: 36px;
          margin-bottom: 12px;
          accent-color: var(--accent);
        }

        .btn-download {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 16px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text2);
          font-family: 'Instrument Sans', sans-serif;
          font-size: 12px; letter-spacing: 0.08em;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-download:hover { border-color: var(--accent); color: var(--accent); }
        .dl-icon { font-size: 14px; }

        .empty-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 48px 24px; text-align: center;
          border: 1px dashed var(--border);
          border-radius: 10px; gap: 8px;
        }
        .empty-icon { font-size: 32px; color: var(--text3); margin-bottom: 8px; opacity: 0.4; }
        .empty-text { font-size: 14px; color: var(--text2); }
        .empty-sub { font-size: 12px; color: var(--text3); }

        .footer {
          text-align: center; margin-top: 56px;
          font-size: 11px; color: var(--text3);
          letter-spacing: 0.08em;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

