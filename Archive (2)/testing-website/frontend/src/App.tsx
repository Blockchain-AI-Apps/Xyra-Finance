import { useState } from 'react';
import './index.css';

function App() {
  const [loading, setLoading] = useState(false);
  const isPremium = localStorage.getItem('isPremium') === 'true';

  const handleCheckout = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://testing-website-backend.vercel.app/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: 'NullPay Pro Subscription',
          price: 1
        })
      });

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert("Failed to create checkout session.");
      }
    } catch (err) {
      alert("Error contacting merchant backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-container">
      <div className="premium-card fade-in">
        {/* Card Header (Gradient Image) */}
        <div className="card-header">
          <div className="badge">1 USDCx / Month</div>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 3V7M3 5H7M6 17V21M4 19H8M11 3L13.286 9.857L21 12L15.714 14.143L13 21L10.714 14.143L3 12L8.714 9.857L11 3Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Card Body */}
        <div className="card-content">
          <span className="category-tag">Merchant Service Demo</span>
          <h1>Pro Subscription</h1>
          <p className="description">
            Experience complete financial privacy with Zero-Knowledge verification on Aleo.
          </p>

          {isPremium ? (
            <button className="premium-button" style={{ 
               cursor: 'default', 
               background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
               boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' 
            }}>
              <span>✓ Premium Member</span>
            </button>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="premium-button"
            >
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  <span>Pay with NullPay</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          )}
          
          <p className="footer-text">
            Secured by @nullpay/node
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
