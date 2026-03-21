import React from 'react';
import './DottedGlobe.css';

const labels = [
    { text: 'Private Invoices', color: '#a5f3fc', pos: 1 },
    { text: 'Encrypted Receipts', color: '#34d399', pos: 3 },
    { text: 'Multi-Pay', color: '#f472b6', pos: 5 },
    { text: 'USDCx', color: '#fbbf24', pos: 6 },
    { text: 'Mobile App', color: '#38bdf8', pos: 7 },
    { text: 'Donations', color: '#a78bfa', pos: 8 },
    { text: 'Buy Me a Coffee', color: '#fb7185', pos: 9 },
    { text: 'USAD', color: '#4ade80', pos: 10 },
];

const DottedGlobe: React.FC = () => {
    return (
        <div className="hero-globe-wrapper">
            <img
                src="/assets/aleo_globe.png"
                alt="Aleo Globe"
                className="hero-globe-img"
                style={{
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                }}
            />

            <div className="hero-ellipse hero-ellipse--dashed" />
            <div className="hero-ellipse hero-ellipse--solid" />

            {labels.map((label) => (
                <div key={label.pos} className={`hero-label hero-label--${label.pos}`}>
                    <span className="hero-label-dot" style={{ background: label.color, color: label.color }} />
                    <span className="hero-label-text">{label.text}</span>
                </div>
            ))}
        </div>
    );
};

export default DottedGlobe;
