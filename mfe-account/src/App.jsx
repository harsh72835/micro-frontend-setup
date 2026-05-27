import React, { useState } from 'react';
import styles from './App.module.css';

export default function AccountApp() {
  const [crashed, setCrashed] = useState(false);

  if (crashed) throw new Error('Account MFE deliberately crashed');

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Account</h2>
      <p className={styles.meta}>
        Team: Platform · React <strong>17</strong> · v0.1.0 · Isolated bundle
      </p>

      {/* CSS isolation proof: same class name ".container" as Checkout MFE.
          CSS Modules hashes it differently per build — no style leak. */}
      <div className={styles.profile}>
        <div className={styles.avatar}>HP</div>
        <div>
          <div className={styles.name}>Harsh Patel</div>
          <div className={styles.email}>harshpatel8163@gmail.com</div>
        </div>
      </div>

      <div className={styles.note}>
        React 17 is bundled inside this MFE — incompatible with shell's React 18.
        Two React instances coexist via separate __webpack_require__ registries.
      </div>

      <button className={styles.danger} onClick={() => setCrashed(true)}>
        Crash this MFE
      </button>
    </div>
  );
}
