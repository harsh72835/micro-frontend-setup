import React, { useEffect, useState } from 'react';
import { subscribe } from './mfeStatus';

const MFE_NAMES = ['checkout', 'analytics', 'account'];

const DOT = {
  loading: { color: '#888',   title: 'Loading'  },
  loaded:  { color: '#16a34a', title: 'Healthy'  },
  error:   { color: '#dc2626', title: 'Failed'   },
  unknown: { color: '#d97706', title: 'Not visited' },
};

export default function HealthIndicator() {
  const [status, setStatus] = useState({});

  useEffect(() => subscribe(setStatus), []);

  return (
    <div style={styles.wrapper} title="MFE health">
      {MFE_NAMES.map(name => {
        const state = status[name] || 'unknown';
        const dot   = DOT[state];
        return (
          <span
            key={name}
            title={`${name}: ${dot.title}`}
            style={{ ...styles.dot, background: dot.color }}
          />
        );
      })}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginLeft: 'auto',
    paddingRight: '0.5rem',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
};
