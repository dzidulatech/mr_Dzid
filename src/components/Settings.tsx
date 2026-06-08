/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Settings as Gear, Sparkles, Check, Database, HelpCircle, HardDrive, ShieldAlert } from 'lucide-react';
import { AISettings } from '../types';

interface SettingsProps {
  settings: AISettings;
  onSaveSettings: (settings: AISettings) => void;
}

export default function Settings({ settings, onSaveSettings }: SettingsProps) {
  const [provider, setProvider] = useState<AISettings['provider']>(settings.provider || 'gemini');
  const [modelName, setModelName] = useState(settings.modelName || 'gemini-3.5-flash');
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);

  // Connection status testing states
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  // Handle auto presets helper when provider shifts
  const handleProviderChange = (newProvider: AISettings['provider']) => {
    setProvider(newProvider);
    setTestState('idle');
    setTestMessage('');
    if (newProvider === 'gemini') {
      setModelName('gemini-3.5-flash');
    } else if (newProvider === 'ollama') {
      setModelName('llama3');
      setApiKey('http://localhost:11434');
    } else if (newProvider === 'groq') {
      setModelName('llama-3.3-70b-versatile');
    } else if (newProvider === 'openai') {
      setModelName('gpt-4o-mini');
    } else if (newProvider === 'claude') {
      setModelName('claude-3-5-sonnet-20241022');
    } else if (newProvider === 'openrouter') {
      setModelName('google/gemini-2.5-flash');
    } else if (newProvider === 'nvidia') {
      setModelName('nvidia/nemotron-3-ultra-550b-a55b');
      setApiKey('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');
    }
  };

  const handleTestConnection = async () => {
    setTestState('testing');
    setTestMessage('');
    try {
      if (provider === 'ollama') {
        // Local Ollama cannot be easily queried from proxy container (running in cloud context) if it's on localhost.
        // But the browser client can fetch it directly!
        const host = (apiKey || 'http://localhost:11434').trim().replace(/\/$/, '');
        try {
          const res = await fetch(`${host}/api/tags`);
          if (res.ok) {
            setTestState('success');
            setTestMessage(`Ollama responds successfully on ${host}!`);
          } else {
            throw new Error();
          }
        } catch {
          // Fallback check on standard local addresses if they configured something custom that failed
          setTestState('failed');
          setTestMessage(`Unable to reach Ollama on "${host}". Please make sure Ollama is currently running and you have enabled CORS to accept requests from this application domain (e.g. OLLAMA_ORIGINS="*" as an environment variable).`);
        }
      } else {
        // Cloud based models use the backend proxy endpoint to test keys securely
        const res = await fetch('/api/test-connection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ provider, modelName, apiKey }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Server error testing connection.');
        }

        setTestState('success');
        setTestMessage(data.message || `Successfully connected to ${provider}!`);
      }
    } catch (err: any) {
      setTestState('failed');
      setTestMessage(err.message || 'Connection attempt timed out. Check your Internet connection and credentials.');
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSaveSettings({ provider, modelName, apiKey });
    alert('AI Tutor parameters saved successfully!');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto space-y-6"
      id="settings-root"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-105 tracking-tight flex items-center gap-2">
          <Gear className="h-6 w-6 text-slate-500 animate-spin" style={{ animationDuration: '30s' }} />
          Feynman AI Settings
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs">
          Select your local, cloud-hosted or premium LLM parameter engines. The default pre-packaged Gemini mode utilizes Process environment key binds instantly.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Provider Option tab grids */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 font-mono tracking-wider">AI API Provider</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'gemini', name: 'Google Gemini', type: 'Online Engine' },
                { id: 'ollama', name: 'Ollama (Local)', type: 'Local Engine' },
                { id: 'groq', name: 'Groq Cloud', type: 'Fast Inference' },
                { id: 'openai', name: 'OpenAI GPT', type: 'Premium API' },
                { id: 'claude', name: 'Anthropic Claude', type: 'Premium API' },
                { id: 'openrouter', name: 'OpenRouter', type: 'Multi Model' },
                { id: 'nvidia', name: 'NVIDIA NIM', type: 'Reasoning AI' },
              ].map((prov) => {
                const isSelected = provider === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => handleProviderChange(prov.id as any)}
                    className={`text-left p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-50/50 dark:bg-blue-955 border-blue-400 dark:border-blue-500 font-semibold shadow-xs'
                        : 'bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border-slate-250 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-xs text-slate-900 dark:text-slate-100 font-bold block">{prov.name}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-normal">{prov.type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Model Name field */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 font-mono tracking-wider">Model Name / Alias Target</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="gemini-3.5-flash"
                className="w-full bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 px-4 py-3 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none transition-all placeholder:text-slate-400"
                required
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {provider === 'gemini' && 'Default: gemini-3.5-flash (or gemini-3.1-pro-preview)'}
                {provider === 'ollama' && 'Popular local models: llama3, gemma2, qwen2.5'}
                {provider === 'openai' && 'Default: gpt-4o-mini (or gpt-4o)'}
                {provider === 'claude' && 'Default: claude-3-5-sonnet-20241022'}
                {provider === 'groq' && 'Default: llama-3.3-70b-versatile'}
                {provider === 'openrouter' && 'Identify openrouter path, e.g. google/gemini-2.5-flash'}
                {provider === 'nvidia' && 'NVIDIA model: nvidia/nemotron-3-ultra-550b-a55b'}
              </p>
            </div>

            {/* API Key or Ollama Host Address field */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 font-mono tracking-wider">
                {provider === 'ollama' ? 'Ollama Host Address' : 'Custom API Security Key'}
              </label>
              <div className="relative">
                <input
                  type={provider === 'ollama' ? 'text' : showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'Enter custom credential key'}
                  className="w-full bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 px-4 py-3 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none transition-all placeholder:text-slate-400"
                />
                {provider !== 'ollama' && apiKey && (
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {provider === 'ollama' ? 'Default: http://localhost:11434 (Must enable OLLAMA_ORIGINS="*" environment variable for CORS)' : provider === 'nvidia' ? 'Uses prefilled NVIDIA API Key unless customized.' : 'If left blank, our server fallback leverages prefilled sandbox API keys.'}
              </p>
            </div>
          </div>

          {/* Test connection results and status alerts */}
          {testState !== 'idle' && (
            <div className={`p-4 rounded-xl text-xs border ${
              testState === 'testing'
                ? 'bg-blue-50/30 dark:bg-blue-955/20 border-blue-200/50 text-blue-800 dark:text-blue-300'
                : testState === 'success'
                ? 'bg-emerald-50/50 dark:bg-emerald-955/20 border-emerald-200/50 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50/50 dark:bg-rose-955/20 border-rose-200/50 text-rose-800 dark:text-rose-300'
            }`}>
              <div className="font-bold mb-0.5">
                {testState === 'testing' && 'Testing AI credentials...'}
                {testState === 'success' && 'Connection Perfect'}
                {testState === 'failed' && 'Connection Issue'}
              </div>
              <div>{testMessage || (testState === 'testing' ? 'Attempting a text completions challenge to verify settings...' : '')}</div>
            </div>
          )}

          {/* Settings Alert constraints */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 p-4 rounded-xl flex gap-2.5 items-start text-xs text-slate-650 dark:text-slate-400">
            <ShieldAlert className="h-4.5 w-4.5 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              We never save your custom keys or secrets to public repositories. All data triggers remain local or are safely passed as body payload variables to proxy routes without client-side leak vulnerabilities.
            </p>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-3 flex-wrap">
            {/* Connection Tester */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testState === 'testing'}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
              >
                {testState === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-98"
            >
              Save Parameters
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
