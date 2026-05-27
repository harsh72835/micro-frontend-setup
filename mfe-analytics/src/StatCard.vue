<template>
  <div class="card">
    <div class="value">{{ value }}</div>
    <div class="label">{{ label }}</div>
    <div class="trend" :class="trendClass">{{ trend }}</div>
  </div>
</template>

<script>
export default {
  name: 'StatCard',
  props: {
    label: String,
    value: String,
    trend: String,
  },
  computed: {
    trendClass() {
      return this.trend.startsWith('+') ? 'positive' : 'negative';
    },
  },
};
</script>

<style scoped>
.card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
}

.label {
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.25rem;
}

.trend {
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.positive { color: #16a34a; }
.negative { color: #c00; }
</style>
