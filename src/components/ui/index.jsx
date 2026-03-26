// FumuGold — UI Components
import React, { useState, useRef } from 'react';
import { G } from '../../theme.js';

// ── Panel ────────────────────────────────────────────────
export function Panel({ children, style, title, actions }) {
  return (
    <div style={{
      background: G.panel, border: `1px solid ${G.border}`,
      borderRadius: G.r2, padding: '16px 20px',
      boxShadow: G.shadow, ...style,
    }}>
      {(title || actions) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          {title && <span style={{ fontFamily: G.fontMono, fontSize: 11, color: G.goldDim, textTransform: 'uppercase', letterSpacing: 2 }}>{title}</span>}
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────
export function Badge({ label, color, size = 'sm' }) {
  const fs = size === 'sm' ? 10 : 12;
  const bg = color ? color + '22' : G.goldGlow;
  const fg = color || G.gold;
  return (
    <span style={{
      background: bg, color: fg, border: `1px solid ${fg}44`,
      borderRadius: 3, padding: `2px 7px`, fontSize: fs,
      fontFamily: G.fontMono, textTransform: 'uppercase', letterSpacing: 1,
    }}>{label}</span>
  );
}

// ── Dot (status indicator) ───────────────────────────────
export function Dot({ color, size = 8, pulse = false }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      borderRadius: '50%', background: color || G.green,
      boxShadow: pulse ? `0 0 8px ${color || G.green}` : 'none',
      flexShrink: 0,
    }} />
  );
}

// ── Ring (circular progress) ─────────────────────────────
export function Ring({ value = 0, max = 100, size = 48, color, label }) {
  const pct  = Math.min(value / max, 1);
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={G.border} strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color || G.gold} strokeWidth={3}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      {label && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: G.text, fontFamily: G.fontMono }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: G.bg3, border: `1px solid ${G.border}`,
        borderRadius: G.r2, padding: '20px 24px', width, maxWidth: '95vw',
        maxHeight: '85vh', overflowY: 'auto', boxShadow: G.shadowGold,
      }}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: G.fontTitle, fontSize: 14, color: G.gold }}>{title}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: G.textDim, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ── FormRow ──────────────────────────────────────────────
export function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontSize: 11, color: G.goldDim, marginBottom: 5, fontFamily: G.fontMono, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>}
      {children}
    </div>
  );
}

// ── GInput ───────────────────────────────────────────────
export function GInput({ value, onChange, placeholder, type = 'text', disabled, style }) {
  return (
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} disabled={disabled}
      style={{
        width: '100%', padding: '9px 12px', background: 'rgba(212,175,55,0.04)',
        border: `1px solid ${G.border}`, borderRadius: G.r, color: G.text,
        fontFamily: G.fontBody, fontSize: 13, outline: 'none',
        opacity: disabled ? 0.5 : 1, ...style,
      }}
    />
  );
}

// ── GSelect ──────────────────────────────────────────────
export function GSelect({ value, onChange, options = [], style }) {
  return (
    <select value={value} onChange={onChange} style={{
      width: '100%', padding: '9px 12px', background: G.bg3,
      border: `1px solid ${G.border}`, borderRadius: G.r, color: G.text,
      fontFamily: G.fontBody, fontSize: 13, outline: 'none', cursor: 'pointer', ...style,
    }}>
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  );
}

// ── StatCard ─────────────────────────────────────────────
export function StatCard({ label, value, sub, color, icon, style }) {
  return (
    <div style={{
      background: G.panel, border: `1px solid ${G.border}`,
      borderRadius: G.r2, padding: '14px 18px', ...style,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 10, color: G.goldDim, fontFamily: G.fontMono, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>{label}</div>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 26, fontFamily: G.fontMono, color: color || G.gold, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: G.textDim, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ── SectionHeader ────────────────────────────────────────
export function SectionHeader({ title, sub, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div>
        <div style={{ fontFamily: G.fontTitle, fontSize: 15, color: G.gold }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: G.textDim, marginTop: 2 }}>{sub}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  );
}

// ── FileUploader ─────────────────────────────────────────
export function FileUploader({ onFile, accept = '*', label = 'Carregar ficheiro' }) {
  const ref = useRef();
  return (
    <div>
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
      <button onClick={() => ref.current.click()} style={{
        background: G.goldGlow, border: `1px solid ${G.border}`,
        borderRadius: G.r, padding: '8px 14px', color: G.gold,
        fontFamily: G.fontBody, fontSize: 13, cursor: 'pointer',
      }}>{label}</button>
    </div>
  );
}
