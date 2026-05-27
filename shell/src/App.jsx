import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import MFELoader from './MFELoader';
import HealthIndicator from './HealthIndicator';

function Nav() {
  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>MFE Shell</span>
      <NavLink to="/" style={navStyle} end>Home</NavLink>
      <NavLink to="/checkout" style={navStyle}>Checkout</NavLink>
      <NavLink to="/analytics" style={navStyle}>Analytics</NavLink>
      <NavLink to="/account" style={navStyle}>Account</NavLink>
      <HealthIndicator />
    </nav>
  );
}

function Home() {
  return (
    <div style={styles.page}>
      <h1>Micro-Frontend Shell</h1>
      <p>Shell owns routing and auth. Each nav item loads an independent MFE.</p>
      <ul style={{ marginTop: '1rem', lineHeight: 2 }}>
        <li><strong>Checkout</strong> — React 18, shared singleton</li>
        <li><strong>Analytics</strong> — Vue 3, completely separate runtime</li>
        <li><strong>Account</strong> — React 17, isolated bundle (intentional version mismatch)</li>
      </ul>
      <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
        Dots in the top-right show per-MFE health. Visit each route to load them.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/checkout/*"
            element={
              <MFELoader
                scope="checkout"
                module="./App"
                mfeName="Checkout"
              />
            }
          />
          <Route
            path="/analytics/*"
            element={
              <MFELoader
                scope="analytics"
                module="./App"
                mfeName="Analytics"
              />
            }
          />
          <Route
            path="/account/*"
            element={
              <MFELoader
                scope="account"
                module="./App"
                mfeName="Account"
              />
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

const navStyle = ({ isActive }) => ({
  padding: '0 1rem',
  color: isActive ? '#fff' : '#ccc',
  textDecoration: 'none',
  fontWeight: isActive ? 600 : 400,
});

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    background: '#1a1a2e',
    padding: '0.75rem 1.5rem',
    gap: '0.5rem',
  },
  brand: {
    color: '#fff',
    fontWeight: 700,
    marginRight: '1.5rem',
    fontSize: '1.1rem',
  },
  main: {
    maxWidth: '960px',
    margin: '2rem auto',
    padding: '0 1rem',
  },
  page: {
    background: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
};
