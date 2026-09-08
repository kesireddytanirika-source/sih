import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { apiFetch } from './api.js';

export default function ChatWidget({ token }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me about your bookings, your token, or how procurement status works.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiFetch('/farmer/chat', { method: 'POST', token, body: { message: text, history } });
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `Sorry, something went wrong: ${err.message}` }]);
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
          <div className="chat-head">Kisan Setu Assistant</div>
          <div className="chat-body">
            {messages.map((m, i) => (
              <div key={i} className={'chat-msg ' + m.role}>{m.content}</div>
            ))}
            {loading && <div className="chat-msg assistant">…</div>}
            <div ref={bottomRef} />
          </div>
          <form className="chat-input-row" onSubmit={send}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your bookings…" />
            <button type="submit" disabled={loading} aria-label="Send message"><Send size={16} /></button>
          </form>
        </div>
      )}
    </>
  );
}
