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

export default function SettingsPage() {
  const router = useRouter();
  const user = currentUser();
  const [settings, setSettings] = useState<AIModelSettings>(emptySettings);
  const [usage, setUsage] = useState<AIUsage>({ period_days: 30, requests: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
  const [logs, setLogs] = useState<AILog[]>([]);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profile, setProfile] = useState<ResearchProfile | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsResult, usageResult, logsResult, profileResult] = await Promise.all([getAIModelSettings(), getAIUsage(), getAILogs(), getOnboarding()]);
        setSettings(settingsResult.data);
        setUsage(usageResult.data);
        setLogs(logsResult.data.logs);
        setProfile(profileResult.data.profile);
      } catch (cause) {
        setStatus(cause instanceof Error ? cause.message : "Unable to load settings");
      } finally {
        setLoading(false);
      }
    };
    void load();
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
    setStatus("Loading model list...");
    try {
      const result = await loadAIModels(settings);
      const models = result.data.models;
      update({ models, model: settings.model || models[0] || "" });
      setStatus(models.length ? `${models.length} models loaded` : "No models returned");
    } catch {
      setStatus("Model list failed; enter model manually");
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
                <label>Model<input list="ai-model-list" value={settings.model} onChange={e => update({ model: e.target.value })} placeholder="agnes-3-flash" /></label>
                <button type="button" onClick={refreshModels} className="secondary-action"><RefreshCw size={15} /> Load Models</button>
                <datalist id="ai-model-list">{settings.models.map(model => <option value={model} key={model} />)}</datalist>
              </div>
              <div className="settings-actions"><span>{status}</span><button className="sign-in compact" disabled={saving}>{saving ? <Loader2 className="spin" /> : <Save />} Save AI Model</button></div>
            </form>
          </section>

          <section className="panel settings-card">
            <SectionHeader title="Account" subtitle="Your authenticated research workspace." />
            <div className="auth-summary">
              <span><KeyRound /></span>
              <div><strong>{user?.name || "Research analyst"}</strong><p>{user?.email || "Account"}</p></div>
              <StatusBadge tone="green">Active</StatusBadge>
            </div>
            {profile && <div className="settings-profile"><div><strong>Research profile</strong><p>{profile.level} · {profile.language} · {profile.plan} demo plan</p><small>Hestra adapts its explanations to this level and your research goal.</small></div><Link className="secondary-action" href="/onboarding">Edit profile</Link></div>}
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
