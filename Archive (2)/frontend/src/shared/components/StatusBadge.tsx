interface StatusBadgeProps {
    status: 'PENDING' | 'SETTLED' | 'EXPIRED';
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
    // Premium Monochrome Styles
    const styles = {
        PENDING: {
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ccc',
            boxShadow: 'none'
        },
        SETTLED: {
            background: '#ffffff',
            border: '1px solid #ffffff',
            color: '#000000',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)'
        },
        EXPIRED: {
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            color: '#555',
            textDecoration: 'line-through'
        },
    };
    const dotStyles = {
        PENDING: {
            background: '#ccc',
            boxShadow: '0 0 5px rgba(200, 200, 200, 0.5)'
        },
        SETTLED: {
            background: '#000',
        },
        EXPIRED: {
            background: '#555',
        },
    };

    const currentStyle = styles[status];
    const currentDotStyle = dotStyles[status];

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '99px',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            ...currentStyle
        }}>
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                ...currentDotStyle
            }}></span>
            <span>{status}</span>
        </span>
    );
};

export default StatusBadge;
