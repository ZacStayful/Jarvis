'use client';

import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LucyLead {
  id: string;
  name: string;
  profile: string;
  conversionProbability: number;
  reason: string;
  daysSinceContact: number;
  properties: number;
  status: string;
  priority: number;
}

interface LucyApprovalCardProps {
  leads: LucyLead[];
  onConfirm: (approvedLeads: LucyLead[]) => void;
  onCancel: () => void;
}

// ─── Profile display config ───────────────────────────────────────────────────

const PROFILE_LABELS: Record<string, string> = {
  'existing-property-stl': 'STL Switch',
  'existing-stl-management': 'STL Mgmt',
  'portfolio-landlord': 'Portfolio',
  'purchasing-stl': 'Purchasing',
  'selling-property': 'Selling',
  'moving-abroad': 'Abroad',
};

const PROFILE_COLOURS: Record<string, string> = {
  'existing-property-stl': '#5d8156',
  'existing-stl-management': '#6a9461',
  'portfolio-landlord': '#7aab70',
  'purchasing-stl': '#d4a84b',
  'selling-property': '#e87722',
  'moving-abroad': '#c0392b',
};

function probColour(p: number): string {
  if (p >= 70) return '#5d8156';
  if (p >= 50) return '#d4a84b';
  return '#888';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LucyApprovalCard({ leads, onConfirm, onCancel }: LucyApprovalCardProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(leads.map(l => l.id))
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const approvedLeads = leads.filter(l => selected.has(l.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-xl rounded-lg overflow-hidden"
        style={{
          background: '#0a120a',
          border: '1px solid #5d8156',
          boxShadow: '0 0 40px rgba(93,129,86,0.15)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: '#0d1a0d', borderBottom: '1px solid #1a2e1a' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: '#5d8156', boxShadow: '0 0 6px #5d8156', animation: 'pulse 2s infinite' }}
            />
            <span
              style={{
                color: '#5d8156',
                fontFamily: 'monospace',
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              Lucy Campaign — Awaiting Authorisation
            </span>
          </div>
          <span
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'monospace',
              fontSize: '11px',
            }}
          >
            {selected.size} / {leads.length} selected
          </span>
        </div>

        {/* ── Lead list ── */}
        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {leads.map((lead, idx) => {
            const active = selected.has(lead.id);
            const profileColour = PROFILE_COLOURS[lead.profile] ?? '#5d8156';
            const profileLabel = PROFILE_LABELS[lead.profile] ?? lead.profile;

            return (
              <div
                key={lead.id}
                onClick={() => toggle(lead.id)}
                style={{
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #1a2e1a',
                  background: active ? '#0d1a0d' : '#0a0f0a',
                  opacity: active ? 1 : 0.45,
                  transition: 'all 0.15s',
                }}
              >
                {/* Index + checkbox */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', paddingTop: '2px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      border: `1px solid ${active ? '#5d8156' : 'rgba(255,255,255,0.15)'}`,
                      background: active ? '#5d8156' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {active && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Lead details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: 'white', fontWeight: 500, fontSize: '13px' }}>{lead.name}</span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: `${profileColour}18`,
                        color: profileColour,
                        border: `1px solid ${profileColour}35`,
                      }}
                    >
                      {profileLabel}
                    </span>
                    {lead.properties > 0 && (
                      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                        {lead.properties} prop{lead.properties !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: '6px' }}>
                    {lead.reason}
                  </p>

                  <div style={{ display: 'flex', gap: '12px', fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
                    {lead.daysSinceContact > 0 && <span>{lead.daysSinceContact}d since contact</span>}
                    {lead.status && <span>{lead.status}</span>}
                  </div>
                </div>

                {/* Probability */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 700, color: probColour(lead.conversionProbability) }}>
                    {lead.conversionProbability}%
                  </div>
                  <div style={{ width: '56px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${lead.conversionProbability}%`,
                        background: probColour(lead.conversionProbability),
                        borderRadius: '2px',
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#0d1a0d',
            borderTop: '1px solid #1a2e1a',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
              {approvedLeads.length} lead{approvedLeads.length !== 1 ? 's' : ''} will be queued
            </span>
            <button
              onClick={() => onConfirm(approvedLeads)}
              disabled={approvedLeads.length === 0}
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                letterSpacing: '0.08em',
                padding: '8px 18px',
                borderRadius: '5px',
                background: approvedLeads.length > 0 ? '#5d8156' : '#2a2a2a',
                color: 'white',
                border: 'none',
                cursor: approvedLeads.length > 0 ? 'pointer' : 'not-allowed',
                opacity: approvedLeads.length > 0 ? 1 : 0.4,
                transition: 'all 0.15s',
              }}
            >
              Confirm Campaign →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
