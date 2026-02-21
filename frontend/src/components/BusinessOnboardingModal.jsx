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
        <div className="modal-header">
          <span className="logo">🌿</span>
          <h2>Welcome to CarboCred</h2>
        </div>

        <p className="modal-hint">
          Please set your business name to get started.
          Your identity is protected: we only store a hashed ID of your wallet.
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
            {loading ? 'Creating Profile...' : 'Complete Onboarding'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(3, 7, 18, 0.9);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        .modal-content {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 1.25rem;
          padding: 2rem;
          max-width: 420px;
          width: 90%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .modal-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.025em;
        }
        .modal-hint {
          color: #94a3b8;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 2rem;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
