import { useEffect, useState } from 'react';

function Success() {
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (sessionId) {
      fetch(`https://testing-website-backend.vercel.app/api/verify-session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.isPremium) {
            localStorage.setItem('isPremium', 'true');
            setVerifying(false);
          } else {
            setError('Payment verification failed. Status: ' + data.status);
            setVerifying(false);
          }
        })
        .catch(() => {
          setError('Error contacting verification server.');
          setVerifying(false);
        });
    } else {
      if (localStorage.getItem('isPremium') === 'true') {
        setVerifying(false);
      } else {
        setError('No session ID found. Please complete checkout.');
        setVerifying(false);
      }
    }
  }, []);

  return (
    <div className="premium-container">
      <div className="premium-card fade-in">
        <div className="card-content">
          {verifying ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
                <div className="loading-spinner" style={{ width: '40px', height: '40px' }} />
              </div>
              <h1 style={{ fontSize: '1.25rem' }}>Verifying Transaction...</h1>
              <p className="description">Checking Zero-Knowledge proofs.</p>
            </>
          ) : error ? (
            <>
              <div className="success-icon-container" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <svg className="success-icon" style={{ color: '#ef4444' }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h1 style={{ fontSize: '1.25rem' }}>Verification Failed</h1>
              <p className="description" style={{ color: '#ef4444' }}>{error}</p>
              <button onClick={() => window.location.href = '/'} className="premium-button">Return to Store</button>
            </>
          ) : (
            <>
              <div className="success-icon-container">
                <svg className="success-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17L4 12" />
                </svg>
              </div>
              <h1>Membership Active</h1>
              <p className="description">
                 Your Pro Subscription is now active. Welcome to the future of private payments on Aleo.
              </p>
              <button onClick={() => window.location.href = '/'} className="premium-button">
                Go to Dashboard
              </button>
              <p className="footer-text">Transaction Verified</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Success;
