"use client";

import { Activity, Bot, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, RefreshCw, Save, TerminalSquare } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { SectionHeader, StatusBadge } from "@/components/shared/ui";
import { AILog, AIModelSettings, AIUsage, emptySettings, getAILogs, getAIModelSettings, getAIUsage, loadAIModels, saveAIModelSettings } from "@/services/ai-model";
import { changePassword, currentUser, logout } from "@/services/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOnboarding, type ResearchProfile } from "@/services/onboarding";
import { estimateEconomics, getBillingStatus, getSectorsUsage, type BillingStatus, type EconomicsInput, type EconomicsResult, type SectorsUsage } from "@/services/billing";

export default function SettingsPage() {
  const router = useRouter();
  const user = currentUser();
  const [settings, setSettings] = useState<AIModelSettings>(emptySettings);
  const [usage, setUsage] = useState<AIUsage>({ period_days: 30, requests: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
  const [logs, setLogs] = useState<AILog[]>([]);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [manualModel, setManualModel] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profile, setProfile] = useState<ResearchProfile | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [sectorsUsage, setSectorsUsage] = useState<SectorsUsage | null>(null);
  const [economics, setEconomics] = useState<EconomicsResult | null>(null);
  const [economicsInput, setEconomicsInput] = useState<EconomicsInput>({ researchers: 0, analysts: 0, sectors_monthly_cost_idr: 0,
    sectors_monthly_credits: 0, average_credits_per_user: null, payment_method: "QRIS" });
  const [economicsError, setEconomicsError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsResult, usageResult, logsResult, profileResult] = await Promise.all([getAIModelSettings(), getAIUsage(), getAILogs(), getOnboarding()]);
        setSettings(settingsResult.data);
        setManualModel(Boolean(settingsResult.data.models.length && settingsResult.data.model && !settingsResult.data.models.includes(settingsResult.data.model)));
        setUsage(usageResult.data);
        setLogs(logsResult.data.logs);
        setProfile(profileResult.data.profile);
        const configured = settingsResult.data;
        if (!configured.models.length && configured.base_url && (configured.has_api_key || configured.api_key)) {
          setModelsLoading(true);
          setStatus("Loading available models...");
          try {
            const result = await loadAIModels(configured);
            const models = result.data.models;
            setSettings(current => ({ ...current, models, model: models.includes(current.model) ? current.model : models[0] || current.model }));
            setStatus(models.length ? `${models.length} models available` : "Gateway returned no models; enter a model ID manually");
          } catch (cause) {
            setStatus(cause instanceof Error ? `Could not load models: ${cause.message}` : "Could not load models; enter a model ID manually");
          } finally {
            setModelsLoading(false);
          }
        }
      } catch (cause) {
        setStatus(cause instanceof Error ? cause.message : "Unable to load settings");
      } finally {
        setLoading(false);
      }
    };
    void load();
    void getBillingStatus().then(result => setBilling(result.data)).catch(() => {});
    void getSectorsUsage().then(result => setSectorsUsage(result.data)).catch(() => {});
  }, []);

  const update = (patch: Partial<AIModelSettings>) => setSettings(current => ({ ...current, ...patch }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus("Saving...");
    try {
      const result = await saveAIModelSettings(settings);
      setSettings(result.data);
      setStatus("AI model settings saved");
    } catch {
      setStatus("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const refreshModels = async () => {
    setModelsLoading(true);
    setStatus("Loading model list...");
    try {
      const result = await loadAIModels(settings);
      const models = result.data.models;
      setSettings(current => ({ ...current, models, model: models.includes(current.model) ? current.model : models[0] || current.model }));
      setManualModel(false);
      setStatus(models.length ? `${models.length} models available` : "Gateway returned no models; enter a model ID manually");
    } catch (cause) {
      setStatus(cause instanceof Error ? `Could not load models: ${cause.message}` : "Could not load models; enter a model ID manually");
    } finally {
      setModelsLoading(false);
    }
  };
  const refreshUsage = async () => {
    try {
      const [nextUsage, nextLogs] = await Promise.all([getAIUsage(), getAILogs()]);
      setUsage(nextUsage.data); setLogs(nextLogs.data.logs); setStatus("Usage refreshed");
    } catch (cause) { setStatus(cause instanceof Error ? cause.message : "Refresh failed"); }
  };
  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword(""); setNewPassword(""); setStatus("Password updated");
    } catch (cause) { setStatus(cause instanceof Error ? cause.message : "Password update failed"); }
  };
  const signOut = async () => {
    await logout(); router.replace("/login");
  };
  const calculateEconomics = async (event: FormEvent) => {
    event.preventDefault(); setEconomicsError("");
    try { setEconomics((await estimateEconomics(economicsInput)).data); }
    catch (cause) { setEconomicsError(cause instanceof Error ? cause.message : "Could not calculate scenario"); }
  };

  return (
    <AppShell chatPreset="dashboard">
      <div className="page settings-page">
        <div className="eyebrow">SETTINGS</div>
        <h1>Workspace Settings</h1>
        <p className="lead">Manage authentication, AI model configuration, usage, and logs.</p>

        <div className="settings-grid">
          <section className="panel settings-card ai-model-card">
            <SectionHeader title="AI Model" subtitle="OpenAI-compatible gateway settings used by Hestra Chat." />
            <form onSubmit={save} className="settings-form">
              <label>Provider<input value={settings.provider} onChange={e => update({ provider: e.target.value })} placeholder="bynara / hermes / custom" /></label>
              <label>Base URL<input value={settings.base_url} onChange={e => update({ base_url: e.target.value })} placeholder="https://router.bynara.id/v1" /></label>
              <label className="key-field">API Key<div><input type={showKey ? "text" : "password"} value={settings.api_key} onChange={e => update({ api_key: e.target.value })} placeholder={settings.has_api_key ? "Key configured — leave blank to keep" : "Enter your API key"} /><button type="button" onClick={() => setShowKey(value => !value)} aria-label="Toggle API key visibility">{showKey ? <EyeOff /> : <Eye />}</button></div></label>
              <div className="model-row">
                <label>Model{settings.models.length > 0 && !manualModel
                  ? <select value={settings.model} onChange={e => update({ model: e.target.value })} aria-label="Default AI model">{settings.models.map(model => <option value={model} key={model}>{model}</option>)}</select>
                  : <input value={settings.model} onChange={e => update({ model: e.target.value })} placeholder="Enter a model ID" aria-label="Default AI model" />}</label>
                <button type="button" onClick={refreshModels} className="secondary-action" disabled={modelsLoading}>{modelsLoading ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />}{modelsLoading ? "Loading..." : settings.models.length ? "Refresh Models" : "Load Models"}</button>
              </div>
              {settings.models.length > 0 && <div className="model-list-note"><span>{settings.models.length} models available from this gateway.</span><button type="button" onClick={() => {
                if (manualModel && !settings.models.includes(settings.model)) update({ model: settings.models[0] });
                setManualModel(value => !value);
              }}>{manualModel ? "Choose from list" : "Enter ID manually"}</button></div>}
              <div className="settings-actions"><span role="status">{status}</span><button className="sign-in compact" disabled={saving || modelsLoading}>{saving ? <Loader2 className="spin" /> : <Save />} Save AI Model</button></div>
            </form>
          </section>

          <section className="panel settings-card">
            <SectionHeader title="Account" subtitle="Your authenticated research workspace." />
            <div className="auth-summary">
              <span><KeyRound /></span>
              <div><strong>{user?.name || "Research analyst"}</strong><p>{user?.email || "Account"}</p></div>
              <StatusBadge tone="green">Active</StatusBadge>
            </div>
            {profile && <div className="settings-profile"><div><strong>Research profile</strong><p>{profile.level} · {profile.language}</p><small>Hestra adapts its explanations to this level and your research goal. Profile selection is not a paid entitlement.</small></div><Link className="secondary-action" href="/onboarding">Edit profile</Link></div>}
            <div className="settings-profile"><div><strong>Sandbox subscription</strong><p>{billing ? `${billing.subscription.plan || "No plan"} · ${billing.subscription.status}` : "Checking…"}</p><small>{billing?.subscription.expires_at ? `Access until ${new Date(billing.subscription.expires_at).toLocaleDateString()}. ` : ""}No real charge or automatic renewal.</small></div><Link className="secondary-action" href="/pricing">Manage plan</Link></div>
            <form className="settings-form" onSubmit={updatePassword}>
              <label>Current password<input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required/></label>
              <label>New password<input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} required minLength={10}/></label>
              <button className="secondary-action">Change Password</button>
            </form>
            <button className="secondary-action" type="button" onClick={signOut}>Sign out</button>
          </section>
        </div>

        <div className="usage-grid">
          <article className="metric-card"><span className="metric-icon"><Activity /></span><div><p>Requests · 30D</p><strong>{usage.requests}</strong><small>{usage.last_used_at ? "Recently active" : "No usage yet"}</small></div></article>
          <article className="metric-card"><span className="metric-icon"><Bot /></span><div><p>Total Tokens</p><strong>{usage.total_tokens.toLocaleString()}</strong><small>{usage.prompt_tokens.toLocaleString()} input</small></div></article>
          <article className="metric-card"><span className="metric-icon"><TerminalSquare /></span><div><p>Completion Tokens</p><strong>{usage.completion_tokens.toLocaleString()}</strong><small>Logged from AI responses</small></div></article>
          <article className="metric-card"><span className="metric-icon"><CheckCircle2 /></span><div><p>Configured Model</p><strong>{settings.model || "Unset"}</strong><small>{settings.provider || "No provider"}</small></div></article>
        </div>

        {sectorsUsage && <section className="panel settings-card sectors-capacity-card">
          <SectionHeader title="Sectors Capacity · Operator" subtitle="Measured upstream requests and cache reuse; actual Sectors credits remain unverified." action="Refresh" onAction={() => void getSectorsUsage().then(result => setSectorsUsage(result.data))}/>
          <div className="capacity-stats"><span><strong>{sectorsUsage.upstream_requests}</strong> Upstream calls · 30D</span><span><strong>{sectorsUsage.cache_hits}</strong> Cache hits</span><span><strong>Unknown</strong> Sectors credits</span></div>
          <p className="capacity-disclosure">{sectorsUsage.credit_disclosure}</p>
          <form className="capacity-form" onSubmit={calculateEconomics}>
            <label>Researcher customers<input type="number" min="0" value={economicsInput.researchers} onChange={event => setEconomicsInput(value => ({ ...value, researchers: Number(event.target.value) }))}/></label>
            <label>Analyst customers<input type="number" min="0" value={economicsInput.analysts} onChange={event => setEconomicsInput(value => ({ ...value, analysts: Number(event.target.value) }))}/></label>
            <label>Sectors cost / month · Rp<input type="number" min="0" value={economicsInput.sectors_monthly_cost_idr} onChange={event => setEconomicsInput(value => ({ ...value, sectors_monthly_cost_idr: Number(event.target.value) }))}/></label>
            <label>Sectors credit budget / month<input type="number" min="0" value={economicsInput.sectors_monthly_credits} onChange={event => setEconomicsInput(value => ({ ...value, sectors_monthly_credits: Number(event.target.value) }))}/></label>
            <label>Assumed credits / active user<input type="number" min="0.01" step="any" value={economicsInput.average_credits_per_user ?? ""} placeholder="Unknown" onChange={event => setEconomicsInput(value => ({ ...value, average_credits_per_user: event.target.value ? Number(event.target.value) : null }))}/></label>
            <label>Payment method<select value={economicsInput.payment_method} onChange={event => setEconomicsInput(value => ({ ...value, payment_method: event.target.value as EconomicsInput["payment_method"] }))}><option value="QRIS">QRIS</option><option value="QRIS_INSTANT">QRIS Instant</option></select></label>
            <button type="submit" className="secondary-action">Calculate scenario</button>
          </form>
          {economicsError && <p className="form-error" role="alert">{economicsError}</p>}
          {economics && <div className="capacity-result"><strong>Scenario only · before hosting, tax, and support</strong><span>Revenue: Rp{economics.revenue_idr.toLocaleString("id-ID")}</span><span>Gateway fees: Rp{economics.payment_gateway_fees_idr.toLocaleString("id-ID")}</span><span>Remaining: Rp{economics.remaining_before_hosting_tax_support_idr.toLocaleString("id-ID")}</span><span>Capacity: {economics.maximum_active_users_at_assumed_burn ?? "Unknown until credit burn is entered"} active users</span><small>{economics.disclosure}</small></div>}
        </section>}

        <section className="panel settings-card log-card">
          <SectionHeader title="AI Logs" subtitle="Recent chat requests, selected model, status, and token usage." action="Refresh" onAction={refreshUsage}/>
          <div className="log-table">
            <table>
              <thead><tr><th>Time</th><th>Provider</th><th>Model</th><th>Status</th><th>Tokens</th><th>Request</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={6}>Loading logs...</td></tr>}
                {!loading && logs.length === 0 && <tr><td colSpan={6}>No AI logs yet. Ask Hestra something to create the first log.</td></tr>}
                {logs.map(log => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.provider}</td><td>{log.model || "Unavailable"}</td><td><StatusBadge tone={log.status === "success" ? "green" : "red"}>{log.status}</StatusBadge></td><td>{log.total_tokens.toLocaleString()}</td><td>{log.request_preview}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
