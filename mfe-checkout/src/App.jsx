import React, { useState } from 'react';
import styles from './App.module.css';

export default function CheckoutApp() {
  const [crashed, setCrashed] = useState(false);

  if (crashed) throw new Error('Checkout MFE deliberately crashed');

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Checkout</h2>
      <p className={styles.meta}>
        Team: Commerce · React <strong>18</strong> · v0.1.0
      </p>

      <div className={styles.cart}>
        <CartItem name="Mechanical Keyboard" price={129} />
        <CartItem name="USB-C Hub" price={49} />
        <div className={styles.total}>Total: $178</div>
      </div>

      <button className={styles.primary}>Place Order</button>

      {/* Crash button — demonstrates error boundary isolation in Phase 2 */}
      <button
        className={styles.danger}
        onClick={() => setCrashed(true)}
      >
        Crash this MFE
      </button>
    </div>
  );
}

function CartItem({ name, price }) {
  return (
    <div className={styles.item}>
      <span>{name}</span>
      <span>${price}</span>
    </div>
  );
}
