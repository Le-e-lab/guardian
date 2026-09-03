'use client';

import { useState } from 'react';
import { MessageSquare, X, Send, CheckCircle, Star } from 'lucide-react';

interface FeedbackWidgetProps {
  pageUrl?: string;
  scanTarget?: string;
}

export default function FeedbackWidget({ pageUrl, scanTarget }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<string>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const categories = [
    { value: 'general', label: 'General feedback' },
    { value: 'praise', label: 'Something worked well' },
    { value: 'complaint', label: 'Something needs improvement' },
    { value: 'bug', label: 'I found a bug' },
    { value: 'feature', label: 'Feature request' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 10) {
      setErrorMsg('Please write at least 10 characters.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: email.trim() || null,
          rating: rating || null,
          pageUrl: pageUrl || window.location.href,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Failed to submit feedback.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  const resetForm = () => {
    setCategory('general');
    setMessage('');
    setEmail('');
    setRating(0);
    setStatus('idle');
    setErrorMsg('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-full shadow-lg shadow-brand-500/30 transition-all hover:scale-105 active:scale-95 text-sm font-semibold"
        aria-label="Give feedback"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]">
      <div className="bg-white rounded-2xl border border-brand-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-100 bg-brand-50/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-semibold text-brand-800">Send Feedback</h3>
          </div>
          <button
            onClick={() => { setIsOpen(false); resetForm(); }}
            className="p-1 rounded-lg hover:bg-brand-100 transition-colors"
          >
            <X className="w-4 h-4 text-brand-500" />
          </button>
        </div>

        {/* Body */}
        {status === 'success' ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm font-semibold text-brand-800 mb-1">Thanks for your feedback!</p>
            <p className="text-xs text-brand-500 mb-4">
              {scanTarget ? `We'll use this to improve the ${scanTarget} scan experience.` : "It helps us build a better product."}
            </p>
            <button
              onClick={() => { setIsOpen(false); resetForm(); }}
              className="px-4 py-2 bg-brand-100 hover:bg-brand-200 text-brand-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {/* Quick Rating */}
            <div>
              <label className="text-xs font-medium text-brand-600 mb-1.5 block">How was your scan experience?</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        star <= (hoveredStar || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-brand-200'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-xs text-brand-500 self-center ml-2">
                    {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Great' : 'Excellent'}
                  </span>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-medium text-brand-600 mb-1.5 block">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      category === cat.value
                        ? 'bg-brand-500 text-white'
                        : 'bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200/50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-medium text-brand-600 mb-1.5 block">Your feedback</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  category === 'bug'
                    ? "What went wrong? Steps to reproduce..."
                    : category === 'feature'
                    ? "What would make this more useful for you?"
                    : category === 'praise'
                    ? "What did you like most?"
                    : "Tell us what you think..."
                }
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm resize-none"
              />
              <p className="text-[10px] text-brand-400 mt-1">{message.length}/2000</p>
            </div>

            {/* Email (optional) */}
            <div>
              <label className="text-xs font-medium text-brand-600 mb-1.5 block">
                Email <span className="text-brand-400">(optional — for follow-up)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Error */}
            {status === 'error' && (
              <p className="text-xs text-red-500">{errorMsg}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'submitting' || !message.trim()}
              className="w-full px-4 py-2.5 bg-accent-500 hover:bg-accent-600 disabled:bg-brand-300 text-white rounded-xl font-semibold text-sm transition-all inline-flex items-center justify-center gap-2"
            >
              {status === 'submitting' ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send Feedback
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
