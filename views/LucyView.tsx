'use client';

import { useState, useEffect, useCallback } from 'react';
import { LucyApprovalCard, type LucyLead } from '@/components/lucy/LucyApprovalCard';
import { LucyCallCard, type CallRecord } from '@/components/lucy/LucyCallCard';
import { LucyMetrics, type LucyAnalysis } from '@/components/lucy/LucyMetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'recommendations' | 'calls' | 'intelligence';

type CampaignState = 'idle' | 'selecting' | 'confirmed';

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#5d8156',
              animation: 'pulse 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
        Processing…
      </span>
    </div>
  );
}

function EmptyState({ icon = '◌', title, sub }: { icon?: string; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 0', textAlign: 'center' }}>
      <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.08)', marginBottom: '12px' }}>{icon}</span>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{title}</p>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)', maxWidth: '280px', lineHeight: 1.5 }}>{sub}</p>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      style={{
        margin: '16px 24px 0',
        padding: '10px 14px',
        borderRadius: '5px',
        background: 'rgba(192,57,43,0.08)',
        border: '1px solid rgba(192,57,43,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(192,57,43,0.9)' }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        ✕
      </button>
    </div>
  );
}

function RecommendationRow({ lead, rank }: { lead: LucyLead; rank: number }) {
  const PROFILE_LABELS: Record<string, string> = {
    'existing-property-stl': 'STL Switch',
    'existing-stl-management': 'STL Mgmt',
    'portfolio-landlord': 'Portfolio',
    'purchasing-stl': 'Purchasing',
    'selling-property': 'Selling',
    'moving-abroad': 'Abroad',
  };

  const probColour =
    lead.conversionProbability >= 70 ? '#5d8156'
    : lead.conversionProbability >= 50 ? '#d4a84b'
    : '#888';

  return (
    <div
      style={{
        background: '#0d1a0d',
        border: '1px solid #1a2e1a',
        borderRadius: '6px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#2d4a2d')}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#1a2e1a')}
    >
      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.2)', paddingTop: '2px', width: '20px', flexShrink: 0 }}>
        {String(rank).padStart(2, '0')}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          <span style={{ color: 'white', fontWeight: 500, fontSize: '13px' }}>{lead.name}</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(93,129,86,0.12)',
              color: '#7a9f72',
              border: '1px solid rgba(93,129,86,0.2)',
            }}
          >
            {PROFILE_LABELS[lead.profile] ?? lead.profile}
          </span>
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: '6px' }}>{lead.reason}</p>
        <div style={{ display: 'flex', gap: '12px', fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
          {lead.daysSinceContact > 0 && <span>{lead.daysSinceContact}d since contact</span>}
          {lead.properties > 0 && <span>{lead.properties} prop{lead.properties !== 1 ? 's' : ''}</span>}
          {lead.status && <span>{lead.status}</span>}
        </div>
      </div>

      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 700, color: probColour }}>
          {lead.conversionProbability}%
        </div>
        <div style={{ width: '48px', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '5px' }}>
          <div style={{ height: '100%', width: `${lead.conversionProbability}%`, background: probColour, borderRadius: '2px' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function LucyView() {
  const [tab, setTab] = useState<Tab>('recommendations');
  const [recommendations, setRecommendations] = useState<LucyLead[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [analysis, setAnalysis] = useState<LucyAnalysis | null>(null);

  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const [campaignState, setCampaignState] = useState<CampaignState>('idle');
  const [confirmedLeads, setConfirmedLeads] = useState<LucyLead[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch recommendations ──
  const fetchRecommendations = useCallback(async () => {
    setLoadingRec(true);
    setError(null);
    try {
      const res = await fetch('/api/lucy/recommend');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecommendations(data.leads ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recommendations');
    } finally {
      setLoadingRec(false);
    }
  }, []);

  // ── Fetch calls ──
  const fetchCalls = useCallback(async () => {
    setLoadingCalls(true);
    try {
      const res = await fetch('/api/lucy/calls');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCalls(data.calls ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load call data');
    } finally {
      setLoadingCalls(false);
    }
  }, []);

  // ── Run analysis ──
  const runAnalysis = useCallback(async () => {
    if (calls.length === 0) return;
    setLoadingAnalysis(true);
    setTab('intelligence');
    try {
      const res = await fetch('/api/lucy/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calls }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoadingAnalysis(false);
    }
  }, [calls]);

  // Initial data load
  useEffect(() => {
    fetchRecommendations();
    fetchCalls();
  }, [fetchRecommendations, fetchCalls]);

  // ── Campaign handlers ──
  const handleConfirmCampaign = (approved: LucyLead[]) => {
    setConfirmedLeads(approved);
    setCampaignState('confirmed');
    // n8n trigger will be wired via existing n8n MCP connection
    // JARVIS will use the n8n API to start the Retell campaign
    console.log('[JARVIS Lucy] Campaign authorised:', approved.map(l => l.name));
  };

  // ── Obsidian log handler ──
  const handleLogToObsidian = (updates: any[]) => {
    // Surfaces the approval flow for writing to Obsidian
    // This hooks into the existing JARVIS Obsidian write approval system
    const content = updates
      .map(u => `## ${u.category}\n\n${u.finding}\n\n_Confidence: ${u.confidence}_\n\nSuggested path: \`${u.obsidianPath}\``)
      .join('\n\n---\n\n');

    console.log('[JARVIS Lucy] Obsidian write requested:\n', content);
    // TODO: Wire to JARVIS approval flow in Phase 8
    alert('Obsidian write request logged — approval flow to be wired in Phase 8');
  };

  // ── Derived stats ──
  const bookedCount = calls.filter(c => /booked|meeting/i.test(c.outcome)).length;
  const avgProb =
    recommendations.length > 0
      ? Math.round(recommendations.reduce((s, l) => s + l.conversionProbability, 0) / recommendations.length)
      : 0;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060d06', color: 'white' }}>

      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: '#080f08',
          borderBottom: '1px solid #1a2e1a',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px', height: '8px',
                borderRadius: '50%',
                background: '#5d8156',
                boxShadow: '0 0 8px rgba(93,129,86,0.8)',
              }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                letterSpacing: '0.2em',
                color: '#5d8156',
                textTransform: 'uppercase',
              }}
            >
              Lucy Intelligence
            </span>
          </div>

          {/* Quick stats */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.25)',
            }}
          >
            <span>{recommendations.length} recommended</span>
            <span>·</span>
            <span>{calls.length} call records</span>
            <span>·</span>
            <span>{bookedCount} booked</span>
            {avgProb > 0 && (
              <>
                <span>·</span>
                <span style={{ color: '#5d8156' }}>avg {avgProb}% prob</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {campaignState === 'confirmed' && (
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '4px 12px',
                borderRadius: '999px',
                border: '1px solid rgba(93,129,86,0.4)',
                color: '#5d8156',
              }}
            >
              ✓ Campaign Authorised — {confirmedLeads.length} lead{confirmedLeads.length !== 1 ? 's' : ''}
            </span>
          )}

          <button
            onClick={() => { fetchRecommendations(); fetchCalls(); }}
            disabled={loadingRec || loadingCalls}
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.3)',
              background: 'none',
              border: 'none',
              cursor: loadingRec ? 'not-allowed' : 'pointer',
              opacity: loadingRec ? 0.4 : 1,
              letterSpacing: '0.05em',
            }}
          >
            ↻ Refresh
          </button>

          {calls.length > 0 && !analysis && (
            <button
              onClick={runAnalysis}
              disabled={loadingAnalysis}
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                letterSpacing: '0.08em',
                padding: '6px 14px',
                borderRadius: '4px',
                background: 'rgba(212,168,75,0.12)',
                color: '#d4a84b',
                border: '1px solid rgba(212,168,75,0.25)',
                cursor: loadingAnalysis ? 'not-allowed' : 'pointer',
                opacity: loadingAnalysis ? 0.4 : 1,
              }}
            >
              Run Analysis
            </button>
          )}

          <button
            onClick={() => setCampaignState('selecting')}
            disabled={recommendations.length === 0 || loadingRec}
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              letterSpacing: '0.06em',
              padding: '7px 16px',
              borderRadius: '5px',
              background: recommendations.length > 0 ? '#5d8156' : '#1a2e1a',
              color: recommendations.length > 0 ? 'white' : 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: recommendations.length > 0 ? 'pointer' : 'not-allowed',
              opacity: loadingRec ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            Trigger Lucy →
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div
        style={{
          display: 'flex',
          padding: '0 24px',
          background: '#080f08',
          borderBottom: '1px solid #1a2e1a',
          flexShrink: 0,
          gap: '0',
        }}
      >
        {(
          [
            { id: 'recommendations' as Tab, label: 'Recommendations', count: recommendations.length },
            { id: 'calls' as Tab, label: 'Call Results', count: calls.length },
            { id: 'intelligence' as Tab, label: 'Intelligence', count: null },
          ]
        ).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '12px 0',
              marginRight: '24px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t.id ? '#5d8156' : 'transparent'}`,
              color: tab === t.id ? '#5d8156' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.15s',
            }}
          >
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: tab === t.id ? 'rgba(93,129,86,0.2)' : 'rgba(255,255,255,0.06)',
                  color: tab === t.id ? '#5d8156' : 'rgba(255,255,255,0.25)',
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Error banner ── */}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* Recommendations */}
        {tab === 'recommendations' && (
          loadingRec ? <Spinner /> :
          recommendations.length === 0 ? (
            <EmptyState
              title="No recommendations"
              sub="All active leads are either booked, disqualified, or too recently contacted. Check back later."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginBottom: '8px' }}>
                {recommendations.length} lead{recommendations.length !== 1 ? 's' : ''} ranked by conversion probability
              </div>
              {recommendations.map((lead, i) => (
                <RecommendationRow key={lead.id} lead={lead} rank={i + 1} />
              ))}
            </div>
          )
        )}

        {/* Call results */}
        {tab === 'calls' && (
          loadingCalls ? <Spinner /> :
          calls.length === 0 ? (
            <EmptyState
              title="No call records found"
              sub="Lucy hasn't made any calls yet, or call outcomes haven't been written back to Monday.com by n8n."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginBottom: '8px' }}>
                {calls.length} record{calls.length !== 1 ? 's' : ''} · {bookedCount} web meeting{bookedCount !== 1 ? 's' : ''} booked
              </div>
              {calls.map(call => (
                <LucyCallCard key={call.id} call={call} />
              ))}
            </div>
          )
        )}

        {/* Intelligence */}
        {tab === 'intelligence' && (
          !analysis && !loadingAnalysis ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', textAlign: 'center' }}>
              <div
                style={{
                  width: '48px', height: '48px',
                  borderRadius: '50%',
                  border: '1px solid #1a2e1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                  background: '#0d1a0d',
                }}
              >
                <span style={{ color: '#5d8156', fontSize: '18px' }}>⧉</span>
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px' }}>
                Pattern Analysis Ready
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginBottom: '24px', maxWidth: '280px', lineHeight: 1.6 }}>
                {calls.length > 0
                  ? `${calls.length} call records available. Run analysis to extract patterns, objection intelligence, and playbook recommendations.`
                  : 'No call data available yet.'}
              </p>
              {calls.length > 0 && (
                <button
                  onClick={runAnalysis}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    background: '#5d8156',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Run Deep Analysis →
                </button>
              )}
            </div>
          ) : (
            <LucyMetrics
              analysis={analysis}
              isLoading={loadingAnalysis}
              onLogToObsidian={handleLogToObsidian}
            />
          )
        )}
      </div>

      {/* ── Approval overlay ── */}
      {campaignState === 'selecting' && (
        <LucyApprovalCard
          leads={recommendations}
          onConfirm={handleConfirmCampaign}
          onCancel={() => setCampaignState('idle')}
        />
      )}
    </div>
  );
}
