import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { apiFetch } from './api.js';
import { useLang } from './i18n.jsx';

export default function ChatWidget({ token, lang }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: t('chat_greeting') },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const lastLang = useRef(lang);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // If the person switches language while chat is open, refresh the
  // greeting so it matches — but don't touch anything they've already typed.
  useEffect(() => {
    if (lastLang.current !== lang) {
      lastLang.current = lang;
      setMessages((m) => (m.length === 1 && m[0].role === 'assistant' ? [{ role: 'assistant', content: t('chat_greeting') }] : m));
    }
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiFetch('/farmer/chat', { method: 'POST', token, body: { message: text, history, lang } });
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: t('chat_error', { error: err.message }) }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close chat' : 'Open chat'}>
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-head">{t('chat_title')}</div>
          <div className="chat-body">
            {messages.map((m, i) => (
              <div key={i} className={'chat-msg ' + m.role}>{m.content}</div>
            ))}
            {loading && <div className="chat-msg assistant">…</div>}
            <div ref={bottomRef} />
          </div>
          <form className="chat-input-row" onSubmit={send}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('chat_placeholder')} />
            <button type="submit" disabled={loading} aria-label="Send message"><Send size={16} /></button>
          </form>
        </div>
      )}
    </>
  );
}
