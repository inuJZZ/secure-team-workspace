"use client";

import { useState } from "react";

const asteroids = [
  { id: "A-01", name: "Khepri", className: "carbonaceous", distance: "1.42 AU", orbit: "234 days", size: "18.6 km", angle: 22 },
  { id: "A-02", name: "Nyx", className: "stony", distance: "2.08 AU", orbit: "412 days", size: "7.3 km", angle: 138 },
  { id: "A-03", name: "Vesta II", className: "metallic", distance: "2.77 AU", orbit: "687 days", size: "42.1 km", angle: 254 },
  { id: "A-04", name: "Calypso", className: "carbonaceous", distance: "3.31 AU", orbit: "1,012 days", size: "11.8 km", angle: 311 },
];

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState(asteroids[0]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-label="Orbital Observatory home"><span className="brand-dot" /> ORBITAL / 04</div>
        <div className="topbar-status"><span className="status-pulse" /> LIVE SIMULATION <span className="divider" /> 07 SEP 2026</div>
        <button className="icon-button" aria-label="Open navigation menu">=</button>
      </header>

      <section className="intro-row">
        <div>
          <p className="eyebrow">GRAVITY SIMULATOR <span>/</span> SECTOR 04</p>
          <h1>THE <em>ORBITAL</em><br />OBSERVATORY</h1>
          <p className="intro-copy">A live cartography of the objects<br className="desktop-only" /> held in our sun&apos;s quiet gravity.</p>
        </div>
        <div className="mission-note"><span>MISSION NOTE 004</span><p>Mapping the minor bodies between Mars and Jupiter. Select an object to inspect its current telemetry.</p></div>
      </section>

      <section className="simulator-layout">
        <div className="simulation-card">
          <div className="card-meta"><span>HELIOS SYSTEM / TOP VIEW</span><span>SIM. RATE {isPlaying ? "1.0X" : "PAUSED"}</span></div>
          <div className={`space-stage ${isPlaying ? "is-playing" : "is-paused"}`} style={{ "--zoom": zoom } as React.CSSProperties}>
            <div className="star-field" />
            <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="orbit orbit-four" />
            <div className="sun"><div className="sun-core" /><span>HELIO</span></div>
            {asteroids.map((asteroid, index) => (
              <button key={asteroid.id} className={`asteroid asteroid-${index + 1} ${selected.id === asteroid.id ? "is-selected" : ""}`} onClick={() => setSelected(asteroid)} aria-label={`Inspect ${asteroid.name}`}>
                <span className="asteroid-rock" /><span className="asteroid-label">{asteroid.id}</span>
              </button>
            ))}
            <div className="stage-crosshair crosshair-top" /><div className="stage-crosshair crosshair-bottom" />
            <div className="stage-coordinates">34° 18&apos; 09&quot; N<br />117° 39&apos; 22&quot; W</div>
          </div>
          <div className="simulation-controls">
            <button className="play-button" onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? "Pause simulation" : "Play simulation"}><span>{isPlaying ? "||" : "▶"}</span> {isPlaying ? "PAUSE" : "PLAY"}</button>
            <div className="zoom-control"><button onClick={() => setZoom(Math.max(.7, zoom - .1))} aria-label="Zoom out">-</button><span>ZOOM <b>{Math.round(zoom * 100)}%</b></span><button onClick={() => setZoom(Math.min(1.4, zoom + .1))} aria-label="Zoom in">+</button></div>
            <span className="frame-count">FRAME 0028491</span>
          </div>
        </div>

        <aside className="telemetry-panel">
          <div className="panel-heading"><span>OBJECT TELEMETRY</span><span className="signal-bars">▮▮▮</span></div>
          <div className="object-identity"><span className="object-index">01 / 04</span><h2>{selected.name}</h2><p>{selected.id} <span>/</span> {selected.className}</p></div>
          <div className="data-grid"><div><span>ORBITAL DISTANCE</span><strong>{selected.distance}</strong></div><div><span>PERIOD</span><strong>{selected.orbit}</strong></div><div><span>EST. DIAMETER</span><strong>{selected.size}</strong></div><div><span>COMPOSITION</span><strong>{selected.className}</strong></div></div>
          <div className="telemetry-line"><span>RELATIVE VELOCITY</span><strong>24.7 km/s</strong></div>
          <div className="object-list"><div className="list-label">OBJECTS IN FIELD <span>04</span></div>{asteroids.map((asteroid) => <button className={selected.id === asteroid.id ? "active" : ""} key={asteroid.id} onClick={() => setSelected(asteroid)}><span className="list-marker" />{asteroid.id}<span>{asteroid.name}</span><i>→</i></button>)}</div>
          <div className="panel-footer"><span>TRACKING STABLE</span><span className="signal-dot" /></div>
        </aside>
      </section>
      <footer className="bottom-note"><span>ORBITAL OBSERVATORY / AN EXPERIMENT IN MOTION</span><span>SCROLL TO EXPLORE <b>↓</b></span></footer>
    </main>
  );
}
