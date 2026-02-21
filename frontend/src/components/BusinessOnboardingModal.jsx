/**
 * components/BusinessOnboardingModal.jsx
 *
 * A modal for first-time profile creation.
 * Maps an anonymous hashed accountId to a human-readable business name.
 */

import React, { useState } from 'react';

export function BusinessOnboardingModal({ isOpen, onSubmit, loading, error, accountId }) {
  const [businessName, setBusinessName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (businessName.trim().length < 2) return;
    onSubmit(businessName.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-icon-ring">
          <span className="modal-icon">🌿</span>
        </div>

        <h2 className="modal-title">Welcome to CarboCred</h2>

        <p className="modal-hint">
          Set your business name to get started. Your identity is protected —
          only a hashed ID of your wallet is stored.
        </p>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-field">
            <label>Business Name</label>
            <input
              type="text"
              required
              autoFocus
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Green Solar Ltd"
              disabled={loading}
              minLength={2}
              maxLength={100}
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || businessName.trim().length < 2}
          >
            {loading ? 'Creating Profile…' : 'Complete Onboarding →'}
          </button>
        </form>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&display=swap');

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: modalFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .modal-content {
          background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1.5rem;
          padding: 2.25rem 2rem;
          max-width: 420px;
          width: 90%;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 32px 80px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255,255,255,0.03);
          animation: modalSlideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
          position: relative;
          overflow: hidden;
        }

        /* ambient green glow in corner */
        .modal-content::after {
          content: '';
          position: absolute;
          bottom: -40px;
          right: -40px;
          width: 180px;
          height: 180px;
          background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .modal-icon-ring {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
          font-size: 1.3rem;
        }

        .modal-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #f8fafc;
          margin: 0 0 0.75rem 0;
          background: linear-gradient(135deg, #f8fafc 40%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .modal-hint {
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.6;
          margin-bottom: 1.75rem;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
